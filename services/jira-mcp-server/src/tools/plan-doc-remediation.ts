import { z } from "zod";

import { toolText } from "../lib/mcp.js";
import type { DocumentGovernanceService } from "../services/document-governance-service.js";

export function registerPlanDocRemediationTool(
  server: { registerTool: Function },
  documentGovernanceService: DocumentGovernanceService
) {
  server.registerTool(
    "plan_doc_remediation",
    {
      title: "Plan Confluence document remediation",
      description:
        "Recommend read-only remediation actions for stale or broken Confluence project-document pages.",
      inputSchema: {
        spaceId: z.string().min(1),
        pageIds: z.array(z.string().min(1)).optional(),
        mode: z.enum(["conservative", "aggressive"]).optional()
      }
    },
    async (input: {
      spaceId: string;
      pageIds?: string[];
      mode?: "conservative" | "aggressive";
    }) => {
      const plan = await documentGovernanceService.planDocRemediation(input);

      return {
        ...toolText(`Planned documentation remediation for ${input.spaceId}.`),
        structuredContent: plan
      };
    }
  );
}
