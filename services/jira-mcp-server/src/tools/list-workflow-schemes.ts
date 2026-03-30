import { z } from "zod";

import { toolText } from "../lib/mcp.js";
import type { JiraApi } from "../services/jira-api.js";

export function registerListWorkflowSchemesTool(
  server: { registerTool: Function },
  jiraApi: JiraApi
) {
  server.registerTool(
    "list_workflow_schemes",
    {
      title: "List Jira workflow schemes",
      description:
        "List accessible Jira workflow schemes for project bootstrap or admin discovery.",
      inputSchema: {
        startAt: z.number().int().min(0).optional(),
        maxResults: z.number().int().positive().max(100).optional()
      }
    },
    async (input: { startAt?: number; maxResults?: number }) => {
      const result = await jiraApi.listWorkflowSchemes(input);

      return {
        ...toolText(
          `Fetched ${result.values?.length ?? 0} workflow schemes.`
        ),
        structuredContent: {
          startAt: result.startAt ?? 0,
          maxResults: result.maxResults ?? result.values?.length ?? 0,
          total: result.total ?? result.values?.length ?? 0,
          values: result.values ?? []
        }
      };
    }
  );
}

