import { z } from "zod";

import type { AppConfig } from "../config.js";
import { toolText } from "../lib/mcp.js";
import {
  buildDryRunResult,
  ensureWriteAllowed
} from "../policy/write-policy.js";
import type { QualityControlService } from "../services/quality-control-service.js";

export function registerCreateBugFromValidationFailureTool(
  server: { registerTool: Function },
  qualityControlService: QualityControlService,
  config: AppConfig
) {
  server.registerTool(
    "create_bug_from_validation_failure",
    {
      title: "Create bug from validation failure",
      description:
        "Create a bug or safe fallback work item from failed validation, preserve structured evidence, and link it back to the affected work.",
      inputSchema: {
        parentIssueKey: z.string().min(1),
        affectedIssueKeys: z.array(z.string().min(1)).optional(),
        validationIssueKey: z.string().min(1).optional(),
        summary: z.string().min(1),
        actualBehavior: z.string().min(1),
        expectedBehavior: z.string().min(1),
        reproductionSteps: z.array(z.string().min(1)).min(1),
        environment: z.string().min(1).optional(),
        evidence: z.array(z.string().min(1)).optional(),
        confirm: z.boolean().optional()
      }
    },
    async (input: {
      parentIssueKey: string;
      affectedIssueKeys?: string[];
      validationIssueKey?: string;
      summary: string;
      actualBehavior: string;
      expectedBehavior: string;
      reproductionSteps: string[];
      environment?: string;
      evidence?: string[];
      confirm?: boolean;
    }) => {
      const plan = await qualityControlService.planBugFromValidationFailure(
        input
      );
      const writeMode = ensureWriteAllowed(
        config,
        "create_issue",
        input.confirm
      );

      if (writeMode.mode === "dry-run") {
        return {
          ...toolText(
            `Dry-run: would create bug work from failed validation on ${input.parentIssueKey}.`
          ),
          structuredContent: buildDryRunResult("create_issue", plan)
        };
      }

      const result = await qualityControlService.createBugFromValidationFailure(
        input
      );

      return {
        ...toolText(
          `Created bug work ${result.createdIssue.key} for ${input.parentIssueKey}.`
        ),
        structuredContent: result
      };
    }
  );
}
