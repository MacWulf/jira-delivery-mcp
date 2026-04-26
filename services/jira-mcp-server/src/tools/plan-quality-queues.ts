import { z } from "zod";

import { toolText } from "../lib/mcp.js";
import type { QualityGovernanceService } from "../services/quality-governance-service.js";

export function registerPlanQualityQueuesTool(
  server: { registerTool: Function },
  qualityGovernanceService: QualityGovernanceService
) {
  server.registerTool(
    "plan_quality_queues",
    {
      title: "Plan quality queues",
      description:
        "Recommend tenant-aware Jira queues, filters, and automation guidance for triage, reopened work, and retest.",
      inputSchema: {
        projectKey: z.string().min(1)
      }
    },
    async (input: { projectKey: string }) => {
      const plan = await qualityGovernanceService.planQualityQueues(
        input.projectKey
      );

      return {
        ...toolText(`Planned quality queues for ${input.projectKey}.`),
        structuredContent: plan
      };
    }
  );
}
