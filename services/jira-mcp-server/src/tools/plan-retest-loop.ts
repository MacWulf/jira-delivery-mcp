import { z } from "zod";

import { toolText } from "../lib/mcp.js";
import type { QualityControlService } from "../services/quality-control-service.js";

export function registerPlanRetestLoopTool(
  server: { registerTool: Function },
  qualityControlService: QualityControlService
) {
  server.registerTool(
    "plan_retest_loop",
    {
      title: "Plan retest loop",
      description:
        "Plan the next quality step after a validation failure or bug fix without mutating Jira state.",
      inputSchema: {
        parentIssueKey: z.string().min(1),
        bugIssueKey: z.string().min(1),
        validationIssueKey: z.string().min(1).optional()
      }
    },
    async (input: {
      parentIssueKey: string;
      bugIssueKey: string;
      validationIssueKey?: string;
    }) => {
      const plan = await qualityControlService.planRetestLoop(input);

      return {
        ...toolText(`Planned retest loop for ${input.parentIssueKey}.`),
        structuredContent: plan
      };
    }
  );
}
