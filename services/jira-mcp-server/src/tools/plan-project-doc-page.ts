import { z } from "zod";

import { toolText } from "../lib/mcp.js";
import type { ProjectDocType } from "../domain/confluence-documents.js";
import type { DocumentPublishingService } from "../services/document-publishing-service.js";

export function registerPlanProjectDocPageTool(
  server: { registerTool: Function },
  documentPublishingService: DocumentPublishingService
) {
  server.registerTool(
    "plan_project_doc_page",
    {
      title: "Plan project documentation page",
      description:
        "Plan a repo-first Confluence project document with deterministic sections, labels, source references, and upsert behavior.",
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
        parentId: z.string().min(1).optional()
      }
    },
    async (input: {
      docType: ProjectDocType;
      sourceIssueKey?: string;
      sourcePaths?: string[];
      title?: string;
      spaceId?: string;
      parentId?: string;
    }) => {
      const plan = await documentPublishingService.planProjectDocPage(input);

      return {
        ...toolText(`Planned Confluence ${input.docType} page ${plan.title}.`),
        structuredContent: plan
      };
    }
  );
}
