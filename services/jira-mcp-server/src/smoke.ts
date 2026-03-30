import "./bootstrap/load-env.js";

import { HttpError } from "./lib/http.js";
import { loadConfig } from "./config.js";
import { JiraApi } from "./services/jira-api.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const jiraApi = new JiraApi(config);
  const projectKey =
    getArgValue("--project") ?? config.defaultProjectKey ?? undefined;

  const myself = await jiraApi.getMyself();

  console.log("Auth OK");
  console.log(
    `User: ${myself.displayName ?? "Unknown"} (${myself.accountId ?? "no-account-id"})`
  );

  if (!projectKey) {
    console.log("No project key configured. Skipping project validation.");
    return;
  }

  try {
    const project = await jiraApi.getProject(projectKey);
    console.log(`Project OK: ${project.key ?? projectKey} - ${project.name ?? "Unknown"}`);

    const search = await jiraApi.searchIssues({
      jql: `project = ${projectKey} ORDER BY created DESC`,
      maxResults: 3,
      fields: ["summary", "status"]
    });

    console.log(`Issue search OK: ${search.issues.length} issues returned.`);
    return;
  } catch (error) {
    if (!(error instanceof HttpError) || error.status !== 404) {
      throw error;
    }

    console.log(`Project key not found or not accessible: ${projectKey}`);

    const projects = await jiraApi.searchProjects(projectKey);
    const suggestions = projects.values ?? [];

    if (suggestions.length === 0) {
      console.log("No visible projects matched the query.");
      return;
    }

    console.log("Visible matching projects:");

    for (const project of suggestions) {
      console.log(`- ${project.key ?? "?"}: ${project.name ?? "Unknown"}`);
    }
  }
}

function getArgValue(flag: string): string | undefined {
  const index = process.argv.findIndex((arg) => arg === flag);

  if (index === -1) {
    return undefined;
  }

  return process.argv[index + 1];
}

main().catch((error) => {
  if (error instanceof HttpError) {
    console.error(`Jira request failed: ${error.message}`);
  } else if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(String(error));
  }

  process.exitCode = 1;
});
