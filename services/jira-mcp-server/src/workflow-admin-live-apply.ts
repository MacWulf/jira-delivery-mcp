import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { config as loadDotenv } from "dotenv";

import { loadConfig } from "./config.js";
import { JiraApi } from "./services/jira-api.js";
import { WorkflowAdminService } from "./services/workflow-admin-service.js";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));

loadDotenv({
  path: path.resolve(currentDirectory, "../../../.env")
});

async function main() {
  const args = new Set(process.argv.slice(2));
  const projectKey = process.argv[2] && !process.argv[2].startsWith("--")
    ? process.argv[2]
    : process.env.JIRA_DEFAULT_PROJECT_KEY;

  if (!projectKey) {
    throw new Error("Missing project key. Pass it as the first argument.");
  }

  const config = loadConfig();
  const jiraApi = new JiraApi(config);
  const workflowAdminService = new WorkflowAdminService(jiraApi);
  const result =
    await workflowAdminService.validateStandardTeamManagedWorkflow(projectKey);

  const artifactDirectory = path.resolve(
    currentDirectory,
    "../artifacts"
  );

  await mkdir(artifactDirectory, { recursive: true });

  const artifactPath = path.join(
    artifactDirectory,
    `workflow-admin-${projectKey.toLowerCase()}-${new Date()
      .toISOString()
      .replaceAll(":", "-")}.json`
  );

  await writeFile(artifactPath, JSON.stringify(result, null, 2), "utf8");

  if (result.validation.errors.length > 0) {
    console.error(JSON.stringify(result.validation, null, 2));
    throw new Error(
      `Workflow validation failed for ${projectKey}. Artifact: ${artifactPath}`
    );
  }

  if (!args.has("--confirm-live")) {
    console.log(
      JSON.stringify(
        {
          mode: "validation-only",
          artifactPath,
          projectKey,
          createdStatuses: result.plan.createdStatuses,
          targetStatusNames: result.plan.targetStatusNames
        },
        null,
        2
      )
    );
    return;
  }

  await jiraApi.updateWorkflow(result.plan.payload);

  console.log(
    JSON.stringify(
      {
        mode: "live-applied",
        artifactPath,
        projectKey,
        createdStatuses: result.plan.createdStatuses,
        targetStatusNames: result.plan.targetStatusNames
      },
      null,
      2
    )
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
