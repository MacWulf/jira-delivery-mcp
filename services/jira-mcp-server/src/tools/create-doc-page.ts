import { z } from "zod";

import type { AppConfig } from "../config.js";
import { toolText } from "../lib/mcp.js";
import { buildDryRunResult, ensureWriteAllowed } from "../policy/write-policy.js";
import type { JiraApi } from "../services/jira-api.js";

export function registerCreateDocPageTool(
  server: { registerTool: Function },
  jiraApi: JiraApi,
  config: AppConfig
) {
  server.registerTool(
    "create_doc_page",
    {
      title: "Create Confluence page",
      description:
        "Create a Confluence page using storage format body content.",
      inputSchema: {
        spaceId: z.string().min(1),
        title: z.string().min(1),
        bodyStorage: z.string().min(1),
        parentId: z.string().min(1).optional(),
        confirm: z.boolean().optional()
      }
    },
    async (input: {
      spaceId: string;
      title: string;
      bodyStorage: string;
      parentId?: string;
      confirm?: boolean;
    }) => {
      if (!config.confluenceBaseUrl && !config.jiraBaseUrl) {
        throw new Error("Confluence is not configured.");
      }

      const writeMode = ensureWriteAllowed(
        config,
        "create_doc_page",
        input.confirm
      );

      if (writeMode.mode === "dry-run") {
        return {
          ...toolText(`Dry-run: would create Confluence page ${input.title}.`),
          structuredContent: buildDryRunResult("create_doc_page", input)
        };
      }

      const payload: {
        spaceId: string;
        title: string;
        bodyStorage: string;
        parentId?: string;
      } = {
        spaceId: input.spaceId,
        title: input.title,
        bodyStorage: input.bodyStorage
      };

      if (input.parentId) {
        payload.parentId = input.parentId;
      }

      const page = await jiraApi.createDocPage(payload);

      return {
        ...toolText(`Created Confluence page ${page.title}.`),
        structuredContent: page
      };
    }
  );
}
