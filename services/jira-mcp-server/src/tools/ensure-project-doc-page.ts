import { z } from "zod";

import type { AppConfig } from "../config.js";
import { toolText } from "../lib/mcp.js";
import type { ProjectDocType } from "../domain/confluence-documents.js";
import {
  buildDryRunResult,
  ensureWriteAllowed
} from "../policy/write-policy.js";
import type { DocumentPublishingService } from "../services/document-publishing-service.js";

export function registerEnsureProjectDocPageTool(
  server: { registerTool: Function },
  documentPublishingService: DocumentPublishingService,
  config: AppConfig
) {
  server.registerTool(
    "ensure_project_doc_page",
    {
      title: "Ensure project documentation page",
      description:
        "Create or update a repo-first Confluence project document after checking for an exact existing page identity first.",
      inputSchema: {
        docType: z.enum([
          "kickoff-summary",
          "project-status-update",
          "implementation-note"
        ]),
        sourceIssueKey: z.string().min(1).optional(),
        sourcePaths: z.array(z.string().min(1)).optional(),
        title: z.string().min(1).optional(),
        spaceId: z.string().min(1).optional(),
        parentId: z.string().min(1).optional(),
        confirm: z.boolean().optional()
      }
    },
    async (input: {
      docType: ProjectDocType;
      sourceIssueKey?: string;
      sourcePaths?: string[];
      title?: string;
      spaceId?: string;
      parentId?: string;
      confirm?: boolean;
    }) => {
      const plan = await documentPublishingService.planProjectDocPage(input);
      const writeMode = ensureWriteAllowed(
        config,
        "ensure_project_doc_page",
        input.confirm
      );

      if (writeMode.mode === "dry-run") {
        return {
          ...toolText(`Dry-run: would ${plan.upsertDecision.action} ${plan.title}.`),
          structuredContent: buildDryRunResult("ensure_project_doc_page", plan)
        };
      }

      const result = await documentPublishingService.ensureProjectDocPage(input);
      const verb =
        result.action === "created"
          ? "Created"
          : result.action === "updated"
            ? "Updated"
            : "Stopped on";

      return {
        ...toolText(`${verb} Confluence project document ${result.title}.`),
        structuredContent: result
      };
    }
  );
}
