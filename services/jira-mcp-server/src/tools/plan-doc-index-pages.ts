import { z } from "zod";

import { toolText } from "../lib/mcp.js";
import type { DocumentGovernanceService } from "../services/document-governance-service.js";

export function registerPlanDocIndexPagesTool(
  server: { registerTool: Function },
  documentGovernanceService: DocumentGovernanceService
) {
  server.registerTool(
    "plan_doc_index_pages",
    {
      title: "Plan Confluence index pages",
      description:
        "Recommend Confluence index pages and reporting fallback logic for repo-first project documentation.",
      inputSchema: {
        spaceId: z.string().min(1),
        docTypes: z
          .array(
            z.enum([
              "kickoff-summary",
              "project-status-update",
              "implementation-note"
            ])
          )
          .optional()
      }
    },
    async (input: {
      spaceId: string;
      docTypes?: Array<
        "kickoff-summary" | "project-status-update" | "implementation-note"
      >;
    }) => {
      const plan = documentGovernanceService.planDocIndexPages(input);

      return {
        ...toolText(`Planned documentation index pages for ${input.spaceId}.`),
        structuredContent: plan
      };
    }
  );
}
