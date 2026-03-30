import { z } from "zod";

import type { AppConfig } from "../config.js";
import { toolText } from "../lib/mcp.js";
import {
  buildDryRunResult,
  ensureWriteAllowed
} from "../policy/write-policy.js";
import type { JiraAssistantService } from "../services/jira-assistant-service.js";
import type { JiraApi } from "../services/jira-api.js";

export function registerMarkIssueBlockedTool(
  server: { registerTool: Function },
  jiraApi: JiraApi,
  assistantService: JiraAssistantService,
  config: AppConfig
) {
  server.registerTool(
    "mark_issue_blocked",
    {
      title: "Mark Jira issue blocked",
      description:
        "Move an issue into the blocked state and require a comment documenting the blocking reason.",
      inputSchema: {
        issueKey: z.string().min(1),
        preferredTransitionName: z.string().min(1).optional(),
        comment: z.string().min(1),
        confirm: z.boolean().optional()
      }
    },
    async (input: {
      issueKey: string;
      preferredTransitionName?: string;
      comment: string;
      confirm?: boolean;
    }) => {
      const plan = await assistantService.planMarkIssueBlocked(
        input.issueKey,
        input.preferredTransitionName
      );

      const writeMode = ensureWriteAllowed(
        config,
        "transition_issue",
        input.confirm
      );

      if (writeMode.mode === "dry-run") {
        return {
          ...toolText(`Dry-run: would mark ${input.issueKey} blocked.`),
          structuredContent: buildDryRunResult("transition_issue", {
            ...plan,
            comment: input.comment
          })
        };
      }

      await jiraApi.transitionIssue({
        issueKey: input.issueKey,
        transitionId: plan.transitionId,
        comment: input.comment
      });

      return {
        ...toolText(`Marked ${input.issueKey} blocked via ${plan.transitionName}.`),
        structuredContent: plan
      };
    }
  );
}
