import { z } from "zod";

import type { AppConfig } from "../config.js";
import { toolText } from "../lib/mcp.js";
import { buildDryRunResult, ensureWriteAllowed } from "../policy/write-policy.js";
import type { JiraApi } from "../services/jira-api.js";

export function registerLinkIssuesTool(
  server: { registerTool: Function },
  jiraApi: JiraApi,
  config: AppConfig
) {
  server.registerTool(
    "link_issues",
    {
      title: "Link Jira issues",
      description: "Create a Jira issue link, for example Blocks or Relates.",
      inputSchema: {
        typeName: z.string().min(1),
        inwardIssueKey: z.string().min(1),
        outwardIssueKey: z.string().min(1),
        comment: z.string().min(1).optional(),
        confirm: z.boolean().optional()
      }
    },
    async (input: {
      typeName: string;
      inwardIssueKey: string;
      outwardIssueKey: string;
      comment?: string;
      confirm?: boolean;
    }) => {
      if (input.inwardIssueKey === input.outwardIssueKey) {
        throw new Error("Cannot link an issue to itself.");
      }

      const writeMode = ensureWriteAllowed(
        config,
        "link_issues",
        input.confirm
      );

      if (writeMode.mode === "dry-run") {
        return {
          ...toolText(
            `Dry-run: would link ${input.inwardIssueKey} -> ${input.outwardIssueKey}.`
          ),
          structuredContent: buildDryRunResult("link_issues", input)
        };
      }

      const payload: {
        typeName: string;
        inwardIssueKey: string;
        outwardIssueKey: string;
        comment?: string;
      } = {
        typeName: input.typeName,
        inwardIssueKey: input.inwardIssueKey,
        outwardIssueKey: input.outwardIssueKey
      };

      if (input.comment) {
        payload.comment = input.comment;
      }

      await jiraApi.linkIssues(payload);

      return {
        ...toolText(
          `Linked ${input.inwardIssueKey} -> ${input.outwardIssueKey} with type ${input.typeName}.`
        ),
        structuredContent: input
      };
    }
  );
}
