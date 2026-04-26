import { z } from "zod";

import { toolText } from "../lib/mcp.js";
import type { DocumentPublishingService } from "../services/document-publishing-service.js";

export function registerGetDocPageTool(
  server: { registerTool: Function },
  documentPublishingService: DocumentPublishingService
) {
  server.registerTool(
    "get_doc_page",
    {
      title: "Get Confluence page",
      description:
        "Read a Confluence page with metadata, labels, and storage-format body.",
      inputSchema: {
        pageId: z.string().min(1)
      }
    },
    async (input: { pageId: string }) => {
      const page = await documentPublishingService.getPage(input.pageId);

      return {
        ...toolText(`Loaded Confluence page ${page.title}.`),
        structuredContent: page
      };
    }
  );
}
