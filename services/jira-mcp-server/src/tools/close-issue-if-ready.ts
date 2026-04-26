import { z } from "zod";

import type { AppConfig } from "../config.js";
import { toolText } from "../lib/mcp.js";
import { evaluateIssueReadiness } from "../policy/readiness-policy.js";
import {
  buildDryRunResult,
  ensureWriteAllowed
} from "../policy/write-policy.js";
import type { JiraIssueForSelection } from "../policy/assistant-policy.js";
import type { DeliveryHelperReconciliationService } from "../services/delivery-helper-reconciliation-service.js";
import type { JiraAssistantService } from "../services/jira-assistant-service.js";
import type { JiraApi } from "../services/jira-api.js";

export function registerCloseIssueIfReadyTool(
  server: { registerTool: Function },
  jiraApi: JiraApi,
  assistantService: JiraAssistantService,
  helperReconciliationService: DeliveryHelperReconciliationService,
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
        qaVerified: z.boolean().optional(),
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
      qaVerified?: boolean;
      preferredTransitionName?: string;
      comment?: string;
      confirm?: boolean;
    }) => {
      const issue = (await jiraApi.getIssue(input.issueKey, [
        "summary",
        "description",
        "status",
        "priority",
        "labels",
        "issuetype",
        "parent",
        "issuelinks"
      ])) as JiraIssueForSelection;
      const readiness = evaluateIssueReadiness(issue, "close");
      const requiresVerifiedQualityGate = ["story", "bug", "validation"].includes(
        readiness.kind
      );

      if (requiresVerifiedQualityGate && input.qaVerified !== true) {
        throw new Error(
          "close_issue_if_ready requires qaVerified=true for story, bug, and validation work so Done always reflects explicit verification."
        );
      }

      if (
        !input.testsPassed ||
        !input.docsUpdated ||
        !input.reviewComplete ||
        (requiresVerifiedQualityGate && input.qaVerified !== true) ||
        input.qaVerified === false
      ) {
        throw new Error(
          "close_issue_if_ready requires testsPassed=true, docsUpdated=true, reviewComplete=true, and quality-sensitive work also requires qaVerified=true."
        );
      }

      const writeMode = ensureWriteAllowed(
        config,
        "transition_issue",
        input.confirm
      );

      let plan;

      try {
        plan = await assistantService.planCloseIssueIfReady(
          input.issueKey,
          input.preferredTransitionName
        );
      } catch (error) {
        const fallback = await helperReconciliationService.resolveFailure({
          issueKey: input.issueKey,
          operation: "close",
          normalFailure:
            error instanceof Error ? error.message : String(error),
          allowApply: writeMode.mode !== "dry-run",
          ...(input.confirm !== undefined ? { confirm: input.confirm } : {})
        });

        if (
          fallback.resultType === "reconciliation_applied" &&
          input.comment
        ) {
          await jiraApi.addComment({
            issueKey: input.issueKey,
            comment: input.comment
          });
        }

        return {
          ...toolText(fallback.message),
          structuredContent: fallback
        };
      }

      if (writeMode.mode === "dry-run") {
        return {
          ...toolText(`Dry-run: would close ${input.issueKey}.`),
          structuredContent: buildDryRunResult("transition_issue", {
            ...plan,
            resultType: "normal_success",
            comment: input.comment,
            checklist: {
              testsPassed: input.testsPassed,
              docsUpdated: input.docsUpdated,
              reviewComplete: input.reviewComplete,
              qaVerified: input.qaVerified ?? null
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
        structuredContent: {
          resultType: "normal_success",
          operation: "close",
          plan
        }
      };
    }
  );
}
