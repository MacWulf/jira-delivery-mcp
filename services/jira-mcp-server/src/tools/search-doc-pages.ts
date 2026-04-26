import { z } from "zod";

import { toolText } from "../lib/mcp.js";
import type { DocumentPublishingService } from "../services/document-publishing-service.js";

export function registerSearchDocPagesTool(
  server: { registerTool: Function },
  documentPublishingService: DocumentPublishingService
) {
  server.registerTool(
    "search_doc_pages",
    {
      title: "Search Confluence pages",
      description:
        "Search Confluence pages by space, exact title, and optional labels for repo-first documentation publishing.",
      inputSchema: {
        spaceId: z.string().min(1).optional(),
        title: z.string().min(1).optional(),
        labels: z.array(z.string().min(1)).optional()
      }
    },
    async (input: {
      spaceId?: string;
      title?: string;
      labels?: string[];
    }) => {
      const pages = await documentPublishingService.searchPages(input);

      return {
        ...toolText(`Found ${pages.length} matching Confluence pages.`),
        structuredContent: {
          pages
        }
      };
    }
  );
}
