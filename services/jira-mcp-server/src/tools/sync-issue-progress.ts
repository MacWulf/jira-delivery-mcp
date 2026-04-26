import { z } from "zod";

import type { AppConfig } from "../config.js";
import { toolText } from "../lib/mcp.js";
import {
  buildDryRunResult,
  ensureWriteAllowed
} from "../policy/write-policy.js";
import type { DeliveryHelperReconciliationService } from "../services/delivery-helper-reconciliation-service.js";
import type { IssueProgressService } from "../services/issue-progress-service.js";
import type { JiraApi } from "../services/jira-api.js";

export function registerSyncIssueProgressTool(
  server: { registerTool: Function },
  issueProgressService: IssueProgressService,
  jiraApi: JiraApi,
  helperReconciliationService: DeliveryHelperReconciliationService,
  config: AppConfig
) {
  server.registerTool(
    "sync_issue_progress",
    {
      title: "Sync Jira issue status and progress",
      description:
        "Ensure active work is reflected in Jira status and leave a concise progress trace on the issue.",
      inputSchema: {
        issueKey: z.string().min(1),
        progressComment: z.string().min(1),
        preferredTransitionName: z.string().min(1).optional(),
        timeSpentSeconds: z.number().int().positive().optional(),
        started: z.string().min(1).optional(),
        confirm: z.boolean().optional()
      }
    },
    async (input: {
      issueKey: string;
      progressComment: string;
      preferredTransitionName?: string;
      timeSpentSeconds?: number;
      started?: string;
      confirm?: boolean;
    }) => {
      const writeMode = ensureWriteAllowed(
        config,
        "transition_issue",
        input.confirm
      );

      let plan;

      try {
        plan = await issueProgressService.planIssueProgressSync(
          input.issueKey,
          input.preferredTransitionName
        );
      } catch (error) {
        const fallback = await helperReconciliationService.resolveFailure({
          issueKey: input.issueKey,
          operation: "sync",
          normalFailure:
            error instanceof Error ? error.message : String(error),
          allowApply: writeMode.mode !== "dry-run",
          ...(input.confirm !== undefined ? { confirm: input.confirm } : {})
        });

        if (fallback.resultType === "reconciliation_applied") {
          await jiraApi.addComment({
            issueKey: input.issueKey,
            comment: input.progressComment
          });

          let worklogAdded = false;

          if (input.timeSpentSeconds) {
            await jiraApi.addWorklog({
              issueKey: input.issueKey,
              timeSpentSeconds: input.timeSpentSeconds,
              ...(input.started ? { started: input.started } : {}),
              comment: input.progressComment
            });
            worklogAdded = true;
          }

          return {
            ...toolText(fallback.message),
            structuredContent: {
              ...fallback,
              progressCommentAdded: true,
              worklogAdded
            }
          };
        }

        return {
          ...toolText(fallback.message),
          structuredContent: fallback
        };
      }

      if (writeMode.mode === "dry-run") {
        return {
          ...toolText(
            `Dry-run: would sync status and progress for ${input.issueKey}.`
          ),
          structuredContent: buildDryRunResult("transition_issue", {
            ...plan,
            resultType: "normal_success",
            progressComment: input.progressComment,
            ...(input.timeSpentSeconds
              ? { timeSpentSeconds: input.timeSpentSeconds }
              : {}),
            ...(input.started ? { started: input.started } : {})
          })
        };
      }

      const result = await issueProgressService.syncIssueProgress({
        issueKey: input.issueKey,
        progressComment: input.progressComment,
        ...(input.preferredTransitionName
          ? { preferredTransitionName: input.preferredTransitionName }
          : {}),
        ...(input.timeSpentSeconds
          ? { timeSpentSeconds: input.timeSpentSeconds }
          : {}),
        ...(input.started ? { started: input.started } : {})
      });

      return {
        ...toolText(
          result.manualStepRequired
            ? `Synced ${input.issueKey} with fallback progress tracking, but Jira workflow follow-up may still be required.`
            : `Synced ${input.issueKey} status and progress.`
        ),
        structuredContent: {
          resultType: "normal_success",
          operation: "sync",
          result
        }
      };
    }
  );
}
