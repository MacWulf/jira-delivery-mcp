import { z } from "zod";

import { toolText } from "../lib/mcp.js";
import type { DocumentGovernanceService } from "../services/document-governance-service.js";

export function registerPlanDocGovernanceTool(
  server: { registerTool: Function },
  documentGovernanceService: DocumentGovernanceService
) {
  server.registerTool(
    "plan_doc_governance",
    {
      title: "Plan Confluence documentation governance",
      description:
        "Return an admin-safe governance plan for a supported Confluence project document type.",
      inputSchema: {
        docType: z.enum([
          "kickoff-summary",
          "project-status-update",
          "implementation-note"
        ]),
        spaceId: z.string().min(1),
        sensitivity: z
          .enum(["internal", "restricted", "sensitive"])
          .optional()
      }
    },
    async (input: {
      docType: "kickoff-summary" | "project-status-update" | "implementation-note";
      spaceId: string;
      sensitivity?: "internal" | "restricted" | "sensitive";
    }) => {
      const plan = await documentGovernanceService.planDocGovernance(input);

      return {
        ...toolText(`Planned governance for ${input.docType} in ${input.spaceId}.`),
        structuredContent: plan
      };
    }
  );
}
