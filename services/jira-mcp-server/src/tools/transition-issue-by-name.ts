import { z } from "zod";

import type { AppConfig } from "../config.js";
import { toolText } from "../lib/mcp.js";
import { findTransitionByName } from "../policy/assistant-policy.js";
import {
  buildDryRunResult,
  ensureWriteAllowed
} from "../policy/write-policy.js";
import type { JiraApi } from "../services/jira-api.js";

export function registerTransitionIssueByNameTool(
  server: { registerTool: Function },
  jiraApi: JiraApi,
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
      const transitions = await jiraApi.getTransitions(input.issueKey);
      const transition = findTransitionByName(
        transitions.transitions,
        input.transitionName
      );

      if (!transition) {
        throw new Error(
          `Transition '${input.transitionName}' is not available for ${input.issueKey}.`
        );
      }

      const writeMode = ensureWriteAllowed(
        config,
        "transition_issue",
        input.confirm
      );

      if (writeMode.mode === "dry-run") {
        return {
          ...toolText(
            `Dry-run: would transition ${input.issueKey} to ${transition.name}.`
          ),
          structuredContent: buildDryRunResult("transition_issue", {
            issueKey: input.issueKey,
            transitionId: transition.id,
            transitionName: transition.name,
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
        transitionId: transition.id
      };

      if (input.comment) {
        payload.comment = input.comment;
      }

      await jiraApi.transitionIssue(payload);

      return {
        ...toolText(`Transitioned ${input.issueKey} to ${transition.name}.`),
        structuredContent: {
          issueKey: input.issueKey,
          transitionId: transition.id,
          transitionName: transition.name
        }
      };
    }
  );
}
