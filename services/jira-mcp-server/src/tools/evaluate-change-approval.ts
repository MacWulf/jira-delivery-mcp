import { z } from "zod";

import { toolText } from "../lib/mcp.js";
import type { ChangeControlService } from "../services/change-control-service.js";

const changeClassificationSchema = z.enum([
  "change_request",
  "bug",
  "reopen",
  "new_scope",
  "ambiguous"
]);

export function registerEvaluateChangeApprovalTool(
  server: { registerTool: Function },
  changeControlService: ChangeControlService
) {
  server.registerTool(
    "evaluate_change_approval",
    {
      title: "Evaluate change approval gate",
      description:
        "Evaluate whether a planned change should stop behind an explicit approval gate before Jira mutation is applied.",
      inputSchema: {
        issueKey: z.string().min(1),
        summary: z.string().min(1),
        description: z.string().min(1).optional(),
        classification: changeClassificationSchema.optional(),
        relatedIssueKeys: z.array(z.string().min(1)).optional(),
        createSummary: z.string().min(1).optional(),
        createIssueType: z.string().min(1).optional(),
        dependencyAdjustments: z
          .array(
            z.object({
              action: z.enum(["add", "remove"]),
              sourceIssueKey: z.string().min(1),
              targetIssueKey: z.string().min(1),
              typeName: z.string().min(1).optional(),
              existingLinkId: z.string().min(1).optional()
            })
          )
          .optional()
      }
    },
    async (input: {
      issueKey: string;
      summary: string;
      description?: string;
      classification?:
        | "change_request"
        | "bug"
        | "reopen"
        | "new_scope"
        | "ambiguous";
      relatedIssueKeys?: string[];
      createSummary?: string;
      createIssueType?: string;
      dependencyAdjustments?: Array<{
        action: "add" | "remove";
        sourceIssueKey: string;
        targetIssueKey: string;
        typeName?: string;
        existingLinkId?: string;
      }>;
    }) => {
      const result = await changeControlService.evaluateChangeApproval(input);

      return {
        ...toolText(
          result.approvalRequired
            ? "The planned change requires explicit approval."
            : "The planned change does not require a separate approval gate."
        ),
        structuredContent: result
      };
    }
  );
}
