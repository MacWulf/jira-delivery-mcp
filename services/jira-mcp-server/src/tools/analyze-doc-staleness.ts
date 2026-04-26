import { z } from "zod";

import { toolText } from "../lib/mcp.js";
import type { DocumentGovernanceService } from "../services/document-governance-service.js";

export function registerAnalyzeDocStalenessTool(
  server: { registerTool: Function },
  documentGovernanceService: DocumentGovernanceService
) {
  server.registerTool(
    "analyze_doc_staleness",
    {
      title: "Analyze Confluence document staleness",
      description:
        "Inspect Confluence pages with read-only heuristics and flag stale or broken publishing-contract candidates.",
      inputSchema: {
        spaceId: z.string().min(1),
        pageIds: z.array(z.string().min(1)).optional(),
        docType: z
          .enum(["kickoff-summary", "project-status-update", "implementation-note"])
          .optional()
      }
    },
    async (input: {
      spaceId: string;
      pageIds?: string[];
      docType?: "kickoff-summary" | "project-status-update" | "implementation-note";
    }) => {
      const analysis = await documentGovernanceService.analyzeDocStaleness(
        input
      );

      return {
        ...toolText(`Analyzed Confluence staleness in ${input.spaceId}.`),
        structuredContent: analysis
      };
    }
  );
}
