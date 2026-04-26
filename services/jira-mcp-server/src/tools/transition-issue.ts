import { z } from "zod";

import type { AppConfig } from "../config.js";
import { toolText } from "../lib/mcp.js";
import { buildDryRunResult, ensureWriteAllowed } from "../policy/write-policy.js";
import type { JiraAssistantService } from "../services/jira-assistant-service.js";
import type { JiraApi } from "../services/jira-api.js";

export function registerTransitionIssueTool(
  server: { registerTool: Function },
  jiraApi: JiraApi,
  assistantService: JiraAssistantService,
  config: AppConfig
) {
  server.registerTool(
    "transition_issue",
    {
      title: "Transition Jira issue",
      description: "Move a Jira issue through a valid workflow transition.",
      inputSchema: {
        issueKey: z.string().min(1),
        transitionId: z.string().min(1),
        comment: z.string().min(1).optional(),
        confirm: z.boolean().optional()
      }
    },
    async (input: {
      issueKey: string;
      transitionId: string;
      comment?: string;
      confirm?: boolean;
    }) => {
      const plan = await assistantService.planTransitionIssueById(
        input.issueKey,
        input.transitionId
      );

      const writeMode = ensureWriteAllowed(
        config,
        "transition_issue",
        input.confirm
      );

      if (writeMode.mode === "dry-run") {
        return {
          ...toolText(
            `Dry-run: would transition ${input.issueKey} with transition ${input.transitionId}.`
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
        ...toolText(
          `Transitioned issue ${input.issueKey} with transition ${plan.transitionName}.`
        ),
        structuredContent: plan
      };
    }
  );
}
