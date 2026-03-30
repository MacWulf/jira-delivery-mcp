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
  assertions: Array<{
    name: string;
    ok: boolean;
    details: Record<string, unknown>;
  }>;
};

async function main(): Promise<void> {
  const config = loadConfig();
  const jiraApi = new JiraApi(config);
  const dependencyDriftService = new DependencyDriftService(jiraApi, config);
  const projectKey = config.defaultProjectKey ?? "KAN";
  const assertions: Report["assertions"] = [];

  const blockedIssue = (await jiraApi.getIssue("KAN-39", [
    "summary",
    "status",
    "priority",
    "description",
    "issuelinks"
  ])) as JiraIssueForSelection;
  const blockedSnapshot = buildIssueDependencySnapshot(blockedIssue);

  assertions.push({
    name: "KAN-39 exposes open blocker KAN-38",
    ok: blockedSnapshot.openBlockedBy.some(
      (dependency) => dependency.issueKey === "KAN-38"
    ),
    details: {
      issueKey: "KAN-39",
      openBlockedBy: blockedSnapshot.openBlockedBy
    }
  });

  const dependencyModelIssue = (await jiraApi.getIssue("KAN-57", [
    "summary",
    "status",
    "priority",
    "description",
    "issuelinks"
  ])) as JiraIssueForSelection;
  const dependencyModelSnapshot = buildIssueDependencySnapshot(
    dependencyModelIssue
  );

  assertions.push({
    name: "KAN-57 exposes downstream dependencies KAN-58 and KAN-59",
    ok: dependencyModelSnapshot.blocks.some(
      (dependency) => dependency.issueKey === "KAN-58"
    ) && dependencyModelSnapshot.blocks.some(
      (dependency) => dependency.issueKey === "KAN-59"
    ),
    details: {
      issueKey: "KAN-57",
      blocks: dependencyModelSnapshot.blocks
    }
  });

  assertions.push({
    name: "KAN-57 has no open inbound blockers",
    ok: dependencyModelSnapshot.hasOpenBlockingDependencies === false,
    details: {
      issueKey: "KAN-57",
      openBlockedBy: dependencyModelSnapshot.openBlockedBy
    }
  });

  const blockedSignals = buildDependencyStatusSignals(blockedIssue);

  assertions.push({
    name: "Blocked issue KAN-39 exposes a dependency waiting status signal",
    ok: blockedSignals.some((signal) => signal.code === "blocked_waiting"),
    details: {
      issueKey: "KAN-39",
      dependencyStatusSignals: blockedSignals
    }
  });

  const executionCandidatesSearch = await jiraApi.searchIssues({
    jql: 'project = "KAN" AND statusCategory != Done ORDER BY priority DESC, created ASC',
    maxResults: 50,
    fields: [
      "summary",
      "status",
      "priority",
      "labels",
      "issuetype",
      "parent",
      "issuelinks"
    ]
  });
  const eligibleCandidates = (executionCandidatesSearch.issues as JiraIssueForSelection[])
    .filter((issue) => issue.key !== undefined)
    .filter((issue) => issue.fields?.status?.statusCategory?.key !== "done")
    .filter((issue) => !buildIssueDependencySnapshot(issue).hasOpenBlockingDependencies)
    .sort(compareIssuesForExecution);

  assertions.push({
    name: "Execution ordering keeps the active dependency lane ahead of general backlog noise",
    ok: ["KAN-57", "KAN-58"].includes(eligibleCandidates[0]?.key ?? ""),
    details: {
      topEligible: eligibleCandidates.slice(0, 5).map((issue) => ({
        issueKey: issue.key,
        summary: issue.fields?.summary,
        status: issue.fields?.status?.name,
        labels: issue.fields?.labels,
        parent: issue.fields?.parent?.key
      }))
    }
  });

  const driftReport = await dependencyDriftService.analyze({
    jql: 'issuekey in ("KAN-57","KAN-58","KAN-59") ORDER BY key ASC',
    expectedDependencies: [
      { sourceIssueKey: "KAN-57", targetIssueKey: "KAN-58" },
      { sourceIssueKey: "KAN-57", targetIssueKey: "KAN-59" },
      { sourceIssueKey: "KAN-58", targetIssueKey: "KAN-59" }
    ]
  });

  assertions.push({
    name: "Dependency drift analysis finds no missing expected links in KAN-57..59",
    ok: driftReport.missingExpectedDependencies.length === 0,
    details: {
      missingExpectedDependencies: driftReport.missingExpectedDependencies
    }
  });

  assertions.push({
    name: "Dependency drift analysis finds no unexpected links in KAN-57..59",
    ok: driftReport.unexpectedDependencies.length === 0,
    details: {
      unexpectedDependencies: driftReport.unexpectedDependencies
    }
  });

  const report: Report = {
    ranAt: new Date().toISOString(),
    projectKey,
    assertions
  };

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const artifactDir = resolve(process.cwd(), "artifacts");
  const artifactPath = resolve(
    artifactDir,
    `dependency-control-live-test-${timestamp}.json`
  );

  await mkdir(artifactDir, { recursive: true });
  await writeFile(artifactPath, JSON.stringify(report, null, 2), "utf8");

  const failed = assertions.filter((assertion) => !assertion.ok);

  console.log(`Dependency control live test report: ${artifactPath}`);

  if (failed.length > 0) {
    console.error(JSON.stringify(failed, null, 2));
    process.exitCode = 1;
    return;
  }

  console.log("Dependency control live test OK.");
}

main().catch((error) => {
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(String(error));
  }

  process.exitCode = 1;
});
