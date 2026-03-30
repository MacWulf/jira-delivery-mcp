import { z } from "zod";

import { toolText } from "../lib/mcp.js";
import type { JiraApi } from "../services/jira-api.js";

export function registerGetProjectTool(
  server: { registerTool: Function },
  jiraApi: JiraApi
) {
  server.registerTool(
    "get_project",
    {
      title: "Get Jira project",
      description: "Fetch project metadata by project key.",
      inputSchema: {
        projectKey: z.string().min(1)
      }
    },
    async (input: { projectKey: string }) => {
      const project = await jiraApi.getProject(input.projectKey);

      return {
        ...toolText(`Fetched project ${input.projectKey}.`),
        structuredContent: {
          project
        }
      };
    }
  );
}

