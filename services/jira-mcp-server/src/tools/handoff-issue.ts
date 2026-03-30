import { z } from "zod";

import type { AppConfig } from "../config.js";
import { toolText } from "../lib/mcp.js";
import {
  buildDryRunResult,
  ensureWriteAllowed
} from "../policy/write-policy.js";
import type { JiraAssistantService } from "../services/jira-assistant-service.js";
import type { JiraApi } from "../services/jira-api.js";

export function registerHandoffIssueTool(
  server: { registerTool: Function },
  jiraApi: JiraApi,
  assistantService: JiraAssistantService,
  config: AppConfig
) {
  server.registerTool(
    "handoff_issue",
    {
      title: "Handoff Jira issue",
      description:
        "Move an issue to a review or handoff state using configured transition names.",
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
      const plan = await assistantService.planHandoffIssue(
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
          ...toolText(`Dry-run: would hand off ${input.issueKey}.`),
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
        ...toolText(`Handed off ${input.issueKey} via ${plan.transitionName}.`),
        structuredContent: plan
      };
    }
  );
}

