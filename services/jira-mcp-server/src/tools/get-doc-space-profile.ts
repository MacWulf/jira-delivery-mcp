import { z } from "zod";

import { toolText } from "../lib/mcp.js";
import type { DocumentGovernanceService } from "../services/document-governance-service.js";

export function registerGetDocSpaceProfileTool(
  server: { registerTool: Function },
  documentGovernanceService: DocumentGovernanceService
) {
  server.registerTool(
    "get_doc_space_profile",
    {
      title: "Get Confluence space profile",
      description:
        "Inspect a Confluence space and return a planning-safe profile for documentation governance work.",
      inputSchema: {
        spaceId: z.string().min(1)
      }
    },
    async (input: { spaceId: string }) => {
      const profile = await documentGovernanceService.getDocSpaceProfile(
        input.spaceId
      );

      return {
        ...toolText(`Profiled Confluence space ${input.spaceId}.`),
        structuredContent: profile
      };
    }
  );
}
