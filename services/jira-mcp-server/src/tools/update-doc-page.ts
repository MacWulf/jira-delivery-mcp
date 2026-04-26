import { z } from "zod";

import type { AppConfig } from "../config.js";
import { toolText } from "../lib/mcp.js";
import {
  buildDryRunResult,
  ensureWriteAllowed
} from "../policy/write-policy.js";
import type { DocumentPublishingService } from "../services/document-publishing-service.js";

export function registerUpdateDocPageTool(
  server: { registerTool: Function },
  documentPublishingService: DocumentPublishingService,
  config: AppConfig
) {
  server.registerTool(
    "update_doc_page",
    {
      title: "Update Confluence page",
      description:
        "Update a Confluence page with a new storage-format body using an explicit version number.",
      inputSchema: {
        pageId: z.string().min(1),
        title: z.string().min(1).optional(),
        bodyStorage: z.string().min(1),
        version: z.number().int().min(1),
        confirm: z.boolean().optional()
      }
    },
    async (input: {
      pageId: string;
      title?: string;
      bodyStorage: string;
      version: number;
      confirm?: boolean;
    }) => {
      const currentPage = await documentPublishingService.getPage(input.pageId);
      const payload = {
        pageId: input.pageId,
        title: input.title ?? currentPage.title,
        bodyStorage: input.bodyStorage,
        version: input.version
      };
      const writeMode = ensureWriteAllowed(
        config,
        "update_doc_page",
        input.confirm
      );

      if (writeMode.mode === "dry-run") {
        return {
          ...toolText(`Dry-run: would update Confluence page ${input.pageId}.`),
          structuredContent: buildDryRunResult("update_doc_page", payload)
        };
      }

      const page = await documentPublishingService.updatePage(payload);

      return {
        ...toolText(`Updated Confluence page ${page.title}.`),
        structuredContent: page
      };
    }
  );
}
