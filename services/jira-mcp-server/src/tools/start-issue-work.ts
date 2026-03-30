import { z } from "zod";

import type { AppConfig } from "../config.js";
import { toolText } from "../lib/mcp.js";
import {
  buildDryRunResult,
  ensureWriteAllowed
} from "../policy/write-policy.js";
import type { JiraAssistantService } from "../services/jira-assistant-service.js";
import type { JiraApi } from "../services/jira-api.js";

export function registerStartIssueWorkTool(
  server: { registerTool: Function },
  jiraApi: JiraApi,
  assistantService: JiraAssistantService,
  config: AppConfig
) {
  server.registerTool(
    "start_issue_work",
    {
      title: "Start Jira issue work",
      description:
        "Validate that an issue is ready to start, then move it to the configured in-progress status.",
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
      const plan = await assistantService.planStartIssueWork(
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
          ...toolText(`Dry-run: would start work on ${input.issueKey}.`),
          structuredContent: buildDryRunResult("transition_issue", {
            ...plan,
            comment: input.comment
          })
        };
      }

      const payload: {
        issueKey: string;
        transitionId: string;
        comment?: string;
      } = {
        issueKey: input.issueKey,
        transitionId: plan.transitionId
      };

      if (input.comment) {
        payload.comment = input.comment;
      }

      await jiraApi.transitionIssue(payload);

      return {
        ...toolText(
          `Started work on ${input.issueKey} via ${plan.transitionName}.`
        ),
        structuredContent: plan
      };
    }
  );
}

