import { z } from "zod";

import type { AppConfig } from "../config.js";
import { toolText } from "../lib/mcp.js";
import {
  buildDryRunResult,
  ensureWriteAllowed
} from "../policy/write-policy.js";
import type { JiraAssistantService } from "../services/jira-assistant-service.js";
import type { JiraApi } from "../services/jira-api.js";

export function registerTransitionIssueByNameTool(
  server: { registerTool: Function },
  jiraApi: JiraApi,
  assistantService: JiraAssistantService,
  config: AppConfig
) {
  server.registerTool(
    "transition_issue_by_name",
    {
      title: "Transition Jira issue by name",
      description:
        "Resolve a Jira transition by its human-readable name and execute it.",
      inputSchema: {
        issueKey: z.string().min(1),
        transitionName: z.string().min(1),
        comment: z.string().min(1).optional(),
        confirm: z.boolean().optional()
      }
    },
    async (input: {
      issueKey: string;
      transitionName: string;
      comment?: string;
      confirm?: boolean;
    }) => {
      const plan = await assistantService.planTransitionIssueByName(
        input.issueKey,
        input.transitionName
      );

      const writeMode = ensureWriteAllowed(
        config,
        "transition_issue",
        input.confirm
      );

      if (writeMode.mode === "dry-run") {
        return {
          ...toolText(
            `Dry-run: would transition ${input.issueKey} to ${plan.transitionName}.`
          ),
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
        ...toolText(`Transitioned ${input.issueKey} to ${plan.transitionName}.`),
        structuredContent: plan
      };
    }
  );
}
