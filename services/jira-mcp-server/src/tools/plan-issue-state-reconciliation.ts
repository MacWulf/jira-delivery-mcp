import { z } from "zod";

import { RECONCILIATION_SEMANTICS } from "../domain/state-reconciliation.js";
import { toolText } from "../lib/mcp.js";
import type { IssueStateReconciliationService } from "../services/issue-state-reconciliation-service.js";

const reconciliationSemanticSchema = z.enum(RECONCILIATION_SEMANTICS);

export function registerPlanIssueStateReconciliationTool(
  server: { registerTool: Function },
  reconciliationService: IssueStateReconciliationService
) {
  server.registerTool(
    "plan_issue_state_reconciliation",
    {
      title: "Plan Jira issue state reconciliation",
      description:
        "Inspect an issue and plan how its Jira state should be aligned with its actual delivery state without mutating Jira.",
      inputSchema: {
        issueKey: z.string().min(1),
        targetSemanticHint: reconciliationSemanticSchema.optional(),
        reason: z.string().min(1).optional()
      }
    },
    async (input: {
      issueKey: string;
      targetSemanticHint?: (typeof RECONCILIATION_SEMANTICS)[number];
      reason?: string;
    }) => {
      const plan = await reconciliationService.planIssueStateReconciliation(input);

      return {
        ...toolText(`Planned workflow state reconciliation for ${input.issueKey}.`),
        structuredContent: plan
      };
    }
  );
}
