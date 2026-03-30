import { z } from "zod";

import type { AppConfig } from "../config.js";
import { toolText } from "../lib/mcp.js";
import { buildDryRunResult, ensureWriteAllowed } from "../policy/write-policy.js";
import type { JiraApi } from "../services/jira-api.js";

export function registerAddWorklogTool(
  server: { registerTool: Function },
  jiraApi: JiraApi,
  config: AppConfig
) {
  server.registerTool(
    "add_worklog",
    {
      title: "Add Jira worklog",
      description: "Add time tracking worklog data to a Jira issue.",
      inputSchema: {
        issueKey: z.string().min(1),
        timeSpentSeconds: z.number().int().positive(),
        comment: z.string().min(1).optional(),
        started: z.string().min(1).optional(),
        confirm: z.boolean().optional()
      }
    },
    async (input: {
      issueKey: string;
      timeSpentSeconds: number;
      comment?: string;
      started?: string;
      confirm?: boolean;
    }) => {
      const writeMode = ensureWriteAllowed(
        config,
        "add_worklog",
        input.confirm
      );

      if (writeMode.mode === "dry-run") {
        return {
          ...toolText(`Dry-run: would add worklog to ${input.issueKey}.`),
          structuredContent: buildDryRunResult("add_worklog", input)
        };
      }

      const payload: {
        issueKey: string;
        timeSpentSeconds: number;
        comment?: string;
        started?: string;
      } = {
        issueKey: input.issueKey,
        timeSpentSeconds: input.timeSpentSeconds
      };

      if (input.comment) {
        payload.comment = input.comment;
      }

      if (input.started) {
        payload.started = input.started;
      }

      const worklog = await jiraApi.addWorklog(payload);

      return {
        ...toolText(`Added worklog to ${input.issueKey}.`),
        structuredContent: {
          issueKey: input.issueKey,
          worklog
        }
      };
    }
  );
}
