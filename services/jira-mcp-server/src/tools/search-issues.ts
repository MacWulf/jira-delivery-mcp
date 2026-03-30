import { z } from "zod";

import { toolText } from "../lib/mcp.js";
import type { JiraApi } from "../services/jira-api.js";

const DEFAULT_FIELDS = [
  "summary",
  "status",
  "priority",
  "assignee",
  "issuetype",
  "project",
  "updated",
  "issuelinks"
];

export function registerSearchIssuesTool(
  server: { registerTool: Function },
  jiraApi: JiraApi
) {
  server.registerTool(
    "search_issues",
    {
      title: "Search Jira issues",
      description: "Search Jira issues with JQL.",
      inputSchema: {
        jql: z.string().min(1),
        maxResults: z.number().int().positive().max(50).optional(),
        fields: z.array(z.string().min(1)).optional()
      }
    },
    async (input: {
      jql: string;
      maxResults?: number;
      fields?: string[];
    }) => {
      const result = await jiraApi.searchIssues({
        jql: input.jql,
        maxResults: input.maxResults ?? 20,
        fields: input.fields ?? DEFAULT_FIELDS
      });

      return {
        ...toolText(`Found ${result.issues.length} issues.`),
        structuredContent: result
      };
    }
  );
}

