import { z } from "zod";

import type { AppConfig } from "../config.js";
import { toolText } from "../lib/mcp.js";
import {
  buildDryRunResult,
  ensureWriteAllowed
} from "../policy/write-policy.js";
import type { QualityControlService } from "../services/quality-control-service.js";

export function registerGenerateValidationWorkTool(
  server: { registerTool: Function },
  qualityControlService: QualityControlService,
  config: AppConfig
) {
  server.registerTool(
    "generate_validation_work",
    {
      title: "Generate validation work",
      description:
        "Generate a dedicated pre-development test plan from an issue's acceptance criteria, using a validation/test issue type when available and falling back safely when needed.",
      inputSchema: {
        issueKey: z.string().min(1),
        confirm: z.boolean().optional()
      }
    },
    async (input: { issueKey: string; confirm?: boolean }) => {
      const plan = await qualityControlService.planValidationWork(input.issueKey);
      const writeMode = ensureWriteAllowed(
        config,
        "create_issue",
        input.confirm
      );

      if (writeMode.mode === "dry-run") {
        return {
          ...toolText(
            `Dry-run: would generate a pre-development test plan for ${input.issueKey}.`
          ),
          structuredContent: buildDryRunResult("create_issue", plan)
        };
      }

      const result = await qualityControlService.createValidationWork(
        input.issueKey
      );

      return {
        ...toolText(
          `Generated pre-development test plan ${result.createdIssue.key} for ${input.issueKey}.`
        ),
        structuredContent: result
      };
    }
  );
}
