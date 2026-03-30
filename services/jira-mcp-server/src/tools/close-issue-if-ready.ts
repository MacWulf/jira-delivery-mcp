import { z } from "zod";

import type { AppConfig } from "../config.js";
import { toolText } from "../lib/mcp.js";
import {
  buildDryRunResult,
  ensureWriteAllowed
} from "../policy/write-policy.js";
import type { JiraAssistantService } from "../services/jira-assistant-service.js";
import type { JiraApi } from "../services/jira-api.js";

export function registerCloseIssueIfReadyTool(
  server: { registerTool: Function },
  jiraApi: JiraApi,
  assistantService: JiraAssistantService,
  config: AppConfig
) {
  server.registerTool(
    "close_issue_if_ready",
    {
      title: "Close Jira issue if ready",
      description:
        "Close an issue only when the caller marks the minimal readiness checklist as complete.",
      inputSchema: {
        issueKey: z.string().min(1),
        testsPassed: z.boolean(),
        docsUpdated: z.boolean(),
        reviewComplete: z.boolean(),
        preferredTransitionName: z.string().min(1).optional(),
        comment: z.string().min(1).optional(),
        confirm: z.boolean().optional()
      }
    },
    async (input: {
      issueKey: string;
      testsPassed: boolean;
      docsUpdated: boolean;
      reviewComplete: boolean;
      preferredTransitionName?: string;
      comment?: string;
      confirm?: boolean;
    }) => {
      if (!input.testsPassed || !input.docsUpdated || !input.reviewComplete) {
        throw new Error(
          "close_issue_if_ready requires testsPassed=true, docsUpdated=true and reviewComplete=true."
        );
      }

      const plan = await assistantService.planCloseIssueIfReady(
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
          ...toolText(`Dry-run: would close ${input.issueKey}.`),
          structuredContent: buildDryRunResult("transition_issue", {
            ...plan,
            comment: input.comment,
            checklist: {
              testsPassed: input.testsPassed,
              docsUpdated: input.docsUpdated,
              reviewComplete: input.reviewComplete
            }
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
        ...toolText(`Closed ${input.issueKey} via ${plan.transitionName}.`),
        structuredContent: plan
      };
    }
  );
}
