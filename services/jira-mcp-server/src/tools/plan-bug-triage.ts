import { z } from "zod";

import { toolText } from "../lib/mcp.js";
import type { QualityGovernanceService } from "../services/quality-governance-service.js";

export function registerPlanBugTriageTool(
  server: { registerTool: Function },
  qualityGovernanceService: QualityGovernanceService
) {
  server.registerTool(
    "plan_bug_triage",
    {
      title: "Plan bug triage",
      description:
        "Classify a bug report into repro-ready, need-info, duplicate, rejected, or non-repro without mutating Jira.",
      inputSchema: {
        summary: z.string().min(1),
        actualBehavior: z.string().min(1).optional(),
        expectedBehavior: z.string().min(1).optional(),
        reproductionSteps: z.array(z.string().min(1)).optional(),
        environment: z.string().min(1).optional(),
        evidence: z.array(z.string().min(1)).optional(),
        duplicateOfIssueKey: z.string().min(1).optional(),
        nonReproducible: z.boolean().optional(),
        rejectedReason: z.string().min(1).optional()
      }
    },
    async (input: {
      summary: string;
      actualBehavior?: string;
      expectedBehavior?: string;
      reproductionSteps?: string[];
      environment?: string;
      evidence?: string[];
      duplicateOfIssueKey?: string;
      nonReproducible?: boolean;
      rejectedReason?: string;
    }) => {
      const plan = qualityGovernanceService.planBugTriage(input);

      return {
        ...toolText(`Planned triage outcome: ${plan.outcome}.`),
        structuredContent: plan
      };
    }
  );
}
