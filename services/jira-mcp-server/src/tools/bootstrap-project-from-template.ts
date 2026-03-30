import { z } from "zod";

import { toolText } from "../lib/mcp.js";
import {
  buildDryRunResult,
  ensureWriteAllowed
} from "../policy/write-policy.js";
import type { JiraApi } from "../services/jira-api.js";
import type { AppConfig } from "../config.js";

export function registerBootstrapProjectFromTemplateTool(
  server: { registerTool: Function },
  jiraApi: JiraApi,
  config: AppConfig
) {
  server.registerTool(
    "bootstrap_project_from_template",
    {
      title: "Bootstrap Jira project from template",
      description:
        "Create a new Jira project from an explicit project template and project type key.",
      inputSchema: {
        key: z.string().min(2).max(10).regex(/^[A-Z][A-Z0-9]+$/),
        name: z.string().min(1),
        projectTypeKey: z.enum(["software", "business", "service_desk"]),
        projectTemplateKey: z.string().min(1),
        description: z.string().min(1).optional(),
        url: z.string().url().optional(),
        leadAccountId: z.string().min(1).optional(),
        assigneeType: z.enum(["PROJECT_LEAD", "UNASSIGNED"]).optional(),
        confirm: z.boolean().optional()
      }
    },
    async (input: {
      key: string;
      name: string;
      projectTypeKey: "software" | "business" | "service_desk";
      projectTemplateKey: string;
      description?: string;
      url?: string;
      leadAccountId?: string;
      assigneeType?: "PROJECT_LEAD" | "UNASSIGNED";
      confirm?: boolean;
    }) => {
      const payload: {
        key: string;
        name: string;
        projectTypeKey: string;
        projectTemplateKey: string;
        description?: string;
        url?: string;
        leadAccountId?: string;
        assigneeType?: "PROJECT_LEAD" | "UNASSIGNED";
      } = {
        key: input.key,
        name: input.name,
        projectTypeKey: input.projectTypeKey,
        projectTemplateKey: input.projectTemplateKey
      };

      if (input.description) {
        payload.description = input.description;
      }

      if (input.url) {
        payload.url = input.url;
      }

      if (input.leadAccountId) {
        payload.leadAccountId = input.leadAccountId;
      }

      if (input.assigneeType) {
        payload.assigneeType = input.assigneeType;
      }

      const writeMode = ensureWriteAllowed(
        config,
        "create_project",
        input.confirm
      );

      if (writeMode.mode === "dry-run") {
        return {
          ...toolText(
            `Dry-run: would create project ${input.key} from ${input.projectTemplateKey}.`
          ),
          structuredContent: buildDryRunResult("create_project", payload)
        };
      }

      const project = await jiraApi.createProject(payload);

      return {
        ...toolText(`Created project ${project.key ?? input.key}.`),
        structuredContent: {
          project
        }
      };
    }
  );
}
