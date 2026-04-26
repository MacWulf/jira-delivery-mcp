import { z } from "zod";

import type { AppConfig } from "../config.js";
import { RECONCILIATION_SEMANTICS } from "../domain/state-reconciliation.js";
import { toolText } from "../lib/mcp.js";
import {
  buildDryRunResult,
  ensureWriteAllowed
} from "../policy/write-policy.js";
import type { IssueStateReconciliationService } from "../services/issue-state-reconciliation-service.js";

const reconciliationSemanticSchema = z.enum(RECONCILIATION_SEMANTICS);

export function registerApplyIssueStateReconciliationTool(
  server: { registerTool: Function },
  reconciliationService: IssueStateReconciliationService,
  config: AppConfig
) {
  server.registerTool(
    "apply_issue_state_reconciliation",
    {
      title: "Apply Jira issue state reconciliation",
      description:
        "Align an issue's Jira state to the planned workflow target using one direct transition when possible or a safe multi-hop path when necessary.",
      inputSchema: {
        issueKey: z.string().min(1),
        targetSemanticHint: reconciliationSemanticSchema.optional(),
        reason: z.string().min(1).optional(),
        confirm: z.boolean().optional()
      }
    },
    async (input: {
      issueKey: string;
      targetSemanticHint?: (typeof RECONCILIATION_SEMANTICS)[number];
      reason?: string;
      confirm?: boolean;
    }) => {
      const plan = await reconciliationService.planIssueStateReconciliation(input);
      const writeMode = ensureWriteAllowed(
        config,
        "reconcile_issue_state",
        input.confirm
      );

      if (writeMode.mode === "dry-run") {
        return {
          ...toolText(
            `Dry-run: would reconcile workflow state for ${input.issueKey}.`
          ),
          structuredContent: buildDryRunResult("reconcile_issue_state", plan)
        };
      }

      if (plan.status === "blocked") {
        throw new Error(
          `Issue ${input.issueKey} reconciliation is blocked: ${plan.reason}`
        );
      }

      if (plan.confirmationRequired && input.confirm !== true) {
        throw new Error(
          `Issue ${input.issueKey} reconciliation is supported, but it is currently blocked because it is classified as a risky reconciliation. Retry with confirm=true to execute it live in Atlassian.`
        );
      }

      const result = await reconciliationService.applyIssueStateReconciliation(
        input
      );

      return {
        ...toolText(
          result.applied
            ? `Reconciled ${input.issueKey} into ${result.targetSemantic}.`
            : `${input.issueKey} was already aligned; no reconciliation transition was applied.`
        ),
        structuredContent: result
      };
    }
  );
}
