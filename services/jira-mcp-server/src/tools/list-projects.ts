import { z } from "zod";

import { toolText } from "../lib/mcp.js";
import type { JiraApi } from "../services/jira-api.js";

export function registerListProjectsTool(
  server: { registerTool: Function },
  jiraApi: JiraApi
) {
  server.registerTool(
    "list_projects",
    {
      title: "List Jira projects",
      description: "List visible Jira projects, optionally filtered by query.",
      inputSchema: {
        query: z.string().min(1).optional()
      }
    },
    async (input: { query?: string }) => {
      const projects = await jiraApi.searchProjects(input.query);

      return {
        ...toolText(
          `Fetched ${projects.values?.length ?? 0} visible projects.`
        ),
        structuredContent: {
          projects: projects.values ?? []
        }
      };
    }
  );
}

