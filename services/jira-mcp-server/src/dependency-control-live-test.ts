import "./bootstrap/load-env.js";

import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { loadConfig } from "./config.js";
import { buildIssueDependencySnapshot } from "./policy/dependency-policy.js";
import { buildDependencyStatusSignals } from "./policy/dependency-status-policy.js";
import { compareIssuesForExecution } from "./policy/execution-selection-policy.js";
import type { JiraIssueForSelection } from "./policy/assistant-policy.js";
import { DependencyDriftService } from "./services/dependency-drift-service.js";
import { JiraApi } from "./services/jira-api.js";

type Report = {
  ranAt: string;
  projectKey: string;
  seededIssueKeys: string[];
  assertions: Array<{
    name: string;
    ok: boolean;
    details: Record<string, unknown>;
  }>;
};

async function main(): Promise<void> {
  requireLiveConfirmation();

  const config = loadConfig();
  const jiraApi = new JiraApi(config);
  const dependencyDriftService = new DependencyDriftService(jiraApi, config);
  const projectKey = config.validationProjectKey;

  if (!projectKey) {
    throw new Error(
      "Missing JIRA_VALIDATION_PROJECT_KEY. Refusing to run dependency validation outside the dedicated validation project."
    );
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const label = `dependency-validation-${timestamp.toLowerCase()}`;
  const assertions: Report["assertions"] = [];

  const foundation = await jiraApi.createIssue({
    projectKey,
    issueType: "Task",
    summary: `[Validation] Dependency foundation ${timestamp}`,
    description: "Seeded by the dependency validation flow.",
    labels: [label, "dependency-validation"]
  });
  const dependent = await jiraApi.createIssue({
    projectKey,
    issueType: "Task",
    summary: `[Validation] Dependency dependent ${timestamp}`,
    description: "Seeded by the dependency validation flow.",
    labels: [label, "dependency-validation"]
  });
  const downstream = await jiraApi.createIssue({
    projectKey,
    issueType: "Task",
    summary: `[Validation] Dependency downstream ${timestamp}`,
    description: "Seeded by the dependency validation flow.",
    labels: [label, "dependency-validation"]
  });

  await jiraApi.linkIssues({
    typeName: "Blocks",
    inwardIssueKey: dependent.key,
    outwardIssueKey: foundation.key,
    comment: "Validation dependency link"
  });
  await jiraApi.linkIssues({
    typeName: "Blocks",
    inwardIssueKey: downstream.key,
    outwardIssueKey: dependent.key,
    comment: "Validation dependency link"
  });

  const foundationIssue = (await jiraApi.getIssue(foundation.key, [
    "summary",
    "status",
    "priority",
    "description",
    "issuelinks"
  ])) as JiraIssueForSelection;
  const dependentIssue = (await jiraApi.getIssue(dependent.key, [
    "summary",
    "status",
    "priority",
    "description",
    "issuelinks"
  ])) as JiraIssueForSelection;
  const downstreamIssue = (await jiraApi.getIssue(downstream.key, [
    "summary",
    "status",
    "priority",
    "description",
    "issuelinks"
  ])) as JiraIssueForSelection;

  const foundationSnapshot = buildIssueDependencySnapshot(foundationIssue);
  const dependentSnapshot = buildIssueDependencySnapshot(dependentIssue);
  const downstreamSnapshot = buildIssueDependencySnapshot(downstreamIssue);

  assertions.push({
    name: "Dependent issue exposes an open inbound blocker",
    ok: dependentSnapshot.openBlockedBy.some(
      (dependency) => dependency.issueKey === foundation.key
    ),
    details: {
      issueKey: dependent.key,
      openBlockedBy: dependentSnapshot.openBlockedBy
    }
  });

  assertions.push({
    name: "Foundation issue exposes a downstream dependency",
    ok: foundationSnapshot.blocks.some(
      (dependency) => dependency.issueKey === dependent.key
    ),
    details: {
      issueKey: foundation.key,
      blocks: foundationSnapshot.blocks
    }
  });

  assertions.push({
    name: "Third issue exposes the middle issue as an open blocker",
    ok: downstreamSnapshot.openBlockedBy.some(
      (dependency) => dependency.issueKey === dependent.key
    ),
    details: {
      issueKey: downstream.key,
      openBlockedBy: downstreamSnapshot.openBlockedBy
    }
  });

  const dependentSignals = buildDependencyStatusSignals(dependentIssue);
  assertions.push({
    name: "Blocked work emits a dependency waiting signal",
    ok: dependentSignals.some((signal) => signal.code === "blocked_waiting"),
    details: {
      issueKey: dependent.key,
      dependencyStatusSignals: dependentSignals
    }
  });

  const eligibleCandidates = [foundationIssue, dependentIssue, downstreamIssue]
    .filter((issue) => !buildIssueDependencySnapshot(issue).hasOpenBlockingDependencies)
    .sort(compareIssuesForExecution);

  assertions.push({
    name: "Execution ordering prefers the unblocked issue",
    ok: eligibleCandidates[0]?.key === foundation.key,
    details: {
      candidateOrder: eligibleCandidates.map((issue) => issue.key)
    }
  });

  const driftReport = await dependencyDriftService.analyze({
    jql: `labels = "${label}" ORDER BY key ASC`,
    expectedDependencies: [
      { sourceIssueKey: foundation.key, targetIssueKey: dependent.key },
      { sourceIssueKey: dependent.key, targetIssueKey: downstream.key }
    ]
  });

  assertions.push({
    name: "Dependency drift analysis finds no missing expected links",
    ok: driftReport.missingExpectedDependencies.length === 0,
    details: {
      missingExpectedDependencies: driftReport.missingExpectedDependencies
    }
  });

  assertions.push({
    name: "Dependency drift analysis finds no unexpected links",
    ok: driftReport.unexpectedDependencies.length === 0,
    details: {
      unexpectedDependencies: driftReport.unexpectedDependencies
    }
  });

  const report: Report = {
    ranAt: new Date().toISOString(),
    projectKey,
    seededIssueKeys: [foundation.key, dependent.key, downstream.key],
    assertions
  };

  const artifactDir = resolve(process.cwd(), "artifacts");
  const artifactPath = resolve(
    artifactDir,
    `dependency-control-validation-${timestamp}.json`
  );

  await mkdir(artifactDir, { recursive: true });
  await writeFile(artifactPath, JSON.stringify(report, null, 2), "utf8");

  const failed = assertions.filter((assertion) => !assertion.ok);

  console.log(`Dependency validation report: ${artifactPath}`);

  if (failed.length > 0) {
    console.error(JSON.stringify(failed, null, 2));
    process.exitCode = 1;
    return;
  }

  console.log("Dependency validation OK.");
}

function requireLiveConfirmation(): void {
  if (!process.argv.includes("--confirm-live")) {
    throw new Error(
      "Refusing to run live Jira writes without the --confirm-live flag."
    );
  }
}

main().catch((error) => {
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(String(error));
  }

  process.exitCode = 1;
});
