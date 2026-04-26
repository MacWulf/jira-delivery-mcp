import { z } from "zod";

import { toolText } from "../lib/mcp.js";
import type { DocumentGovernanceService } from "../services/document-governance-service.js";

export function registerPlanDocMetadataPolicyTool(
  server: { registerTool: Function },
  documentGovernanceService: DocumentGovernanceService
) {
  server.registerTool(
    "plan_doc_metadata_policy",
    {
      title: "Plan Confluence metadata policy",
      description:
        "Define the structured metadata policy for a supported project document type without mutating Confluence admin settings.",
      inputSchema: {
        docType: z.enum([
          "kickoff-summary",
          "project-status-update",
          "implementation-note"
        ]),
        spaceId: z.string().min(1).optional()
      }
    },
    async (input: {
      docType: "kickoff-summary" | "project-status-update" | "implementation-note";
      spaceId?: string;
    }) => {
      const policy = documentGovernanceService.planDocMetadataPolicy(input);

      return {
        ...toolText(`Planned metadata policy for ${input.docType}.`),
        structuredContent: policy
      };
    }
  );
}
