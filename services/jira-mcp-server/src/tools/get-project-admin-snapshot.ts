import { z } from "zod";

import { toolText } from "../lib/mcp.js";
import type { JiraApi } from "../services/jira-api.js";

export function registerGetProjectAdminSnapshotTool(
  server: { registerTool: Function },
  jiraApi: JiraApi
) {
  server.registerTool(
    "get_project_admin_snapshot",
    {
      title: "Get Jira project admin snapshot",
      description:
        "Fetch project metadata together with workflow scheme and issue type scheme assignments.",
      inputSchema: {
        projectKey: z.string().min(1)
      }
    },
    async (input: { projectKey: string }) => {
      const project = await jiraApi.getProject(input.projectKey);

      if (!project.id) {
        throw new Error(`Project ${input.projectKey} has no accessible project id.`);
      }

      const [workflowSchemes, issueTypeSchemes] = await Promise.all([
        jiraApi.getProjectWorkflowSchemes(project.id),
        jiraApi.getProjectIssueTypeSchemes(project.id)
      ]);

      const simplified = project.simplified === true;

      return {
        ...toolText(`Fetched admin snapshot for ${input.projectKey}.`),
        structuredContent: {
          project,
          managementModel: simplified ? "team-managed" : "company-managed",
          notes: simplified
            ? [
                "This project appears to be team-managed or simplified. Classic workflow and issue type scheme APIs may return empty assignments."
              ]
            : [],
          workflowSchemes: workflowSchemes.values ?? [],
          issueTypeSchemes: issueTypeSchemes.values ?? []
        }
      };
    }
  );
}
