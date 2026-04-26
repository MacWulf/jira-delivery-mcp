import { toolText } from "../lib/mcp.js";
import type { DocumentPublishingService } from "../services/document-publishing-service.js";

export function registerListDocSpacesTool(
  server: { registerTool: Function },
  documentPublishingService: DocumentPublishingService
) {
  server.registerTool(
    "list_doc_spaces",
    {
      title: "List Confluence spaces",
      description:
        "List accessible Confluence spaces for repo-first documentation publishing.",
      inputSchema: {}
    },
    async () => {
      const spaces = await documentPublishingService.listSpaces();

      return {
        ...toolText(`Found ${spaces.length} accessible Confluence spaces.`),
        structuredContent: {
          spaces
        }
      };
    }
  );
}
