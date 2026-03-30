import "./bootstrap/load-env.js";

import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { loadConfig } from "./config.js";
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
  const snapshot = await dependencyDriftService.analyze({
    jql: 'project = "KAN" AND issuekey in ("KAN-57","KAN-58","KAN-59","KAN-47")',
    expectedDependencies: [
      { sourceIssueKey: "KAN-57", targetIssueKey: "KAN-58", typeName: "Blocks" },
      { sourceIssueKey: "KAN-57", targetIssueKey: "KAN-59", typeName: "Blocks" },
      { sourceIssueKey: "KAN-57", targetIssueKey: "KAN-47", typeName: "Blocks" },
      { sourceIssueKey: "KAN-58", targetIssueKey: "KAN-59", typeName: "Blocks" }
    ]
  });
  const assertions: Report["assertions"] = [
    {
      name: "Dependency drift has no missing expected dependencies in the active dependency lane",
      ok: snapshot.missingExpectedDependencies.length === 0,
      details: {
        missingExpectedDependencies: snapshot.missingExpectedDependencies
      }
    },
    {
      name: "Dependency drift has no unexpected dependencies in scope",
      ok: snapshot.unexpectedDependencies.length === 0,
      details: {
        unexpectedDependencies: snapshot.unexpectedDependencies
      }
    },
    {
      name: "Dependency drift detects no blocked status conflicts in the active lane",
      ok: snapshot.blockedStatusConflicts.length === 0,
      details: {
        blockedStatusConflicts: snapshot.blockedStatusConflicts
      }
    },
    {
      name: "Dependency drift detects no duplicate dependency edges",
      ok: snapshot.duplicateDependencies.length === 0,
      details: {
        duplicateDependencies: snapshot.duplicateDependencies
      }
    },
    {
      name: "Dependency drift detects no stale dependency candidates in the active lane",
      ok: snapshot.staleDependencies.length === 0,
      details: {
        staleDependencies: snapshot.staleDependencies
      }
    }
  ];

  const report: Report = {
    ranAt: new Date().toISOString(),
    projectKey: config.defaultProjectKey ?? "KAN",
    assertions
  };

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const artifactDir = resolve(process.cwd(), "artifacts");
  const artifactPath = resolve(
    artifactDir,
    `dependency-drift-live-test-${timestamp}.json`
  );

  await mkdir(artifactDir, { recursive: true });
  await writeFile(artifactPath, JSON.stringify(report, null, 2), "utf8");

  const failed = assertions.filter((assertion) => !assertion.ok);

  console.log(`Dependency drift live test report: ${artifactPath}`);

  if (failed.length > 0) {
    console.error(JSON.stringify(failed, null, 2));
    process.exitCode = 1;
    return;
  }

  console.log("Dependency drift live test OK.");
}

main().catch((error) => {
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(String(error));
  }

  process.exitCode = 1;
});
