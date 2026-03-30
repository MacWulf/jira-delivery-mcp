import { z } from "zod";

import type { AppConfig } from "../config.js";
import { toolText } from "../lib/mcp.js";
import { buildDryRunResult, ensureWriteAllowed } from "../policy/write-policy.js";
import type { JiraApi } from "../services/jira-api.js";

export function registerAddCommentTool(
  server: { registerTool: Function },
  jiraApi: JiraApi,
  config: AppConfig
) {
  server.registerTool(
    "add_comment",
    {
      title: "Add Jira comment",
      description: "Add a comment to a Jira issue.",
      inputSchema: {
        issueKey: z.string().min(1),
        comment: z.string().min(1),
        confirm: z.boolean().optional()
      }
    },
    async (input: {
      issueKey: string;
      comment: string;
      confirm?: boolean;
    }) => {
      const writeMode = ensureWriteAllowed(
        config,
        "add_comment",
        input.confirm
      );

      if (writeMode.mode === "dry-run") {
        return {
          ...toolText(`Dry-run: would add comment to ${input.issueKey}.`),
          structuredContent: buildDryRunResult("add_comment", input)
        };
      }

      const comment = await jiraApi.addComment({
        issueKey: input.issueKey,
        comment: input.comment
      });

      return {
        ...toolText(`Added comment to ${input.issueKey}.`),
        structuredContent: comment
      };
    }
  );
}
