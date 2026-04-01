import "./bootstrap/load-env.js";

import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { loadConfig } from "./config.js";
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
      "Missing JIRA_VALIDATION_PROJECT_KEY. Refusing to run dependency drift validation outside the dedicated validation project."
    );
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const label = `dependency-drift-${timestamp.toLowerCase()}`;

  const issueA = await jiraApi.createIssue({
    projectKey,
    issueType: "Task",
    summary: `[Validation] Drift source ${timestamp}`,
    description: "Seeded by the dependency drift validation flow.",
    labels: [label, "dependency-drift-validation"]
  });
  const issueB = await jiraApi.createIssue({
    projectKey,
    issueType: "Task",
    summary: `[Validation] Drift middle ${timestamp}`,
    description: "Seeded by the dependency drift validation flow.",
    labels: [label, "dependency-drift-validation"]
  });
  const issueC = await jiraApi.createIssue({
    projectKey,
    issueType: "Task",
    summary: `[Validation] Drift target ${timestamp}`,
    description: "Seeded by the dependency drift validation flow.",
    labels: [label, "dependency-drift-validation"]
  });

  await jiraApi.linkIssues({
    typeName: "Blocks",
    inwardIssueKey: issueB.key,
    outwardIssueKey: issueA.key,
    comment: "Validation dependency link"
  });
  await jiraApi.linkIssues({
    typeName: "Blocks",
    inwardIssueKey: issueC.key,
    outwardIssueKey: issueB.key,
    comment: "Validation dependency link"
  });

  const snapshot = await dependencyDriftService.analyze({
    jql: `labels = "${label}" ORDER BY key ASC`,
    expectedDependencies: [
      { sourceIssueKey: issueA.key, targetIssueKey: issueB.key, typeName: "Blocks" },
      { sourceIssueKey: issueB.key, targetIssueKey: issueC.key, typeName: "Blocks" }
    ]
  });
  const assertions: Report["assertions"] = [
    {
      name: "Dependency drift has no missing expected dependencies",
      ok: snapshot.missingExpectedDependencies.length === 0,
      details: {
        missingExpectedDependencies: snapshot.missingExpectedDependencies
      }
    },
    {
      name: "Dependency drift has no unexpected dependencies",
      ok: snapshot.unexpectedDependencies.length === 0,
      details: {
        unexpectedDependencies: snapshot.unexpectedDependencies
      }
    },
    {
      name: "Dependency drift has no blocked-status conflicts",
      ok: snapshot.blockedStatusConflicts.length === 0,
      details: {
        blockedStatusConflicts: snapshot.blockedStatusConflicts
      }
    },
    {
      name: "Dependency drift has no duplicate dependency edges",
      ok: snapshot.duplicateDependencies.length === 0,
      details: {
        duplicateDependencies: snapshot.duplicateDependencies
      }
    },
    {
      name: "Dependency drift has no stale dependency candidates",
      ok: snapshot.staleDependencies.length === 0,
      details: {
        staleDependencies: snapshot.staleDependencies
      }
    }
  ];

  const report: Report = {
    ranAt: new Date().toISOString(),
    projectKey,
    seededIssueKeys: [issueA.key, issueB.key, issueC.key],
    assertions
  };

  const artifactDir = resolve(process.cwd(), "artifacts");
  const artifactPath = resolve(
    artifactDir,
    `dependency-drift-validation-${timestamp}.json`
  );

  await mkdir(artifactDir, { recursive: true });
  await writeFile(artifactPath, JSON.stringify(report, null, 2), "utf8");

  const failed = assertions.filter((assertion) => !assertion.ok);

  console.log(`Dependency drift validation report: ${artifactPath}`);

  if (failed.length > 0) {
    console.error(JSON.stringify(failed, null, 2));
    process.exitCode = 1;
    return;
  }

  console.log("Dependency drift validation OK.");
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
