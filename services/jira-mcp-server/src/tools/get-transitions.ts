import { z } from "zod";

import { toolText } from "../lib/mcp.js";
import type { JiraApi } from "../services/jira-api.js";

export function registerGetTransitionsTool(
  server: { registerTool: Function },
  jiraApi: JiraApi
) {
  server.registerTool(
    "get_transitions",
    {
      title: "Get Jira transitions",
      description: "Fetch valid Jira workflow transitions for an issue.",
      inputSchema: {
        issueKey: z.string().min(1)
      }
    },
    async (input: { issueKey: string }) => {
      const result = await jiraApi.getTransitions(input.issueKey);

      return {
        ...toolText(
          `Fetched ${result.transitions.length} transitions for ${input.issueKey}.`
        ),
        structuredContent: result
      };
    }
  );
}

