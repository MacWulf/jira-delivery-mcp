import { z } from "zod";

import type { AppConfig } from "../config.js";
import { toolText } from "../lib/mcp.js";
import {
  buildDryRunResult,
  ensureWriteAllowed
} from "../policy/write-policy.js";
import type { JiraAssistantService } from "../services/jira-assistant-service.js";
import type { JiraApi } from "../services/jira-api.js";

export function registerSendIssueToQaTool(
  server: { registerTool: Function },
  jiraApi: JiraApi,
  assistantService: JiraAssistantService,
  config: AppConfig
) {
  server.registerTool(
    "send_issue_to_qa",
    {
      title: "Send Jira issue to QA",
      description:
        "Move an issue from review into acceptance validation using the configured QA transition names.",
      inputSchema: {
        issueKey: z.string().min(1),
        preferredTransitionName: z.string().min(1).optional(),
        comment: z.string().min(1).optional(),
        confirm: z.boolean().optional()
      }
    },
    async (input: {
      issueKey: string;
      preferredTransitionName?: string;
      comment?: string;
      confirm?: boolean;
    }) => {
      const plan = await assistantService.planSendIssueToQa(
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
          ...toolText(`Dry-run: would send ${input.issueKey} to QA.`),
          structuredContent: buildDryRunResult("transition_issue", {
            ...plan,
            comment: input.comment
          })
        };
      }

      await jiraApi.transitionIssue({
        issueKey: input.issueKey,
        transitionId: plan.transitionId,
        ...(input.comment ? { comment: input.comment } : {})
      });

      return {
        ...toolText(`Sent ${input.issueKey} to QA via ${plan.transitionName}.`),
        structuredContent: plan
      };
    }
  );
}
