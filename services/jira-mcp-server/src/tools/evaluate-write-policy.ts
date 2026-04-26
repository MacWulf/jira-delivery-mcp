import { z } from "zod";

import type { AppConfig } from "../config.js";
import { toolText } from "../lib/mcp.js";
import {
  evaluateWritePolicy,
  WRITE_OPERATIONS,
  type WriteOperation
} from "../policy/write-policy.js";

export function registerEvaluateWritePolicyTool(
  server: { registerTool: Function },
  config: AppConfig
) {
  server.registerTool(
    "evaluate_write_policy",
    {
      title: "Evaluate write policy",
      description:
        "Explain whether a supported Jira or Confluence write would execute live, require admin confirmation, or remain in explicit dry-run preview mode.",
      inputSchema: {
        operation: z.enum(WRITE_OPERATIONS),
        confirm: z.boolean().optional()
      }
    },
    async (input: {
      operation: WriteOperation;
      confirm?: boolean;
    }) => {
      const evaluation = evaluateWritePolicy(
        config,
        input.operation,
        input.confirm
      );

      return {
        ...toolText(evaluation.reason),
        structuredContent: evaluation
      };
    }
  );
}
