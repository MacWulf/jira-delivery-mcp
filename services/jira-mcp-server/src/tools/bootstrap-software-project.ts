import { z } from "zod";

import type { AppConfig } from "../config.js";
import { toolText } from "../lib/mcp.js";
import {
  buildDryRunResult,
  ensureWriteAllowed
} from "../policy/write-policy.js";
import type { JiraApi } from "../services/jira-api.js";
import type { ProjectBootstrapService } from "../services/project-bootstrap-service.js";

export function registerBootstrapSoftwareProjectTool(
  server: { registerTool: Function },
  jiraApi: JiraApi,
  bootstrapService: ProjectBootstrapService,
  config: AppConfig
) {
  server.registerTool(
    "bootstrap_software_project",
    {
      title: "Bootstrap Jira software project",
      description:
        "Create a Jira software project from a higher-level delivery model such as kanban or scrum.",
      inputSchema: {
        key: z.string().min(2).max(10).regex(/^[A-Z][A-Z0-9]+$/),
        name: z.string().min(1),
        deliveryModel: z.enum(["kanban", "scrum"]).default("kanban"),
        managementModel: z
          .enum(["team-managed", "company-managed"])
          .default("team-managed"),
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
      deliveryModel?: "kanban" | "scrum";
      managementModel?: "team-managed" | "company-managed";
      description?: string;
      url?: string;
      leadAccountId?: string;
      assigneeType?: "PROJECT_LEAD" | "UNASSIGNED";
      confirm?: boolean;
    }) => {
      const planInput: {
        deliveryModel?: "kanban" | "scrum";
        managementModel?: "team-managed" | "company-managed";
      } = {};

      if (input.deliveryModel) {
        planInput.deliveryModel = input.deliveryModel;
      }

      if (input.managementModel) {
        planInput.managementModel = input.managementModel;
      }

      const plan = bootstrapService.planSoftwareProject(planInput);

      const payload: {
        key: string;
        name: string;
        projectTypeKey: "software";
        projectTemplateKey: string;
        description?: string;
        url?: string;
        leadAccountId?: string;
        assigneeType?: "PROJECT_LEAD" | "UNASSIGNED";
      } = {
        key: input.key,
        name: input.name,
        projectTypeKey: "software",
        projectTemplateKey: plan.projectTemplateKey
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
            `Dry-run: would create a ${plan.managementModel} ${plan.deliveryModel} software project named ${input.name}.`
          ),
          structuredContent: buildDryRunResult("create_project", {
            ...payload,
            deliveryModel: plan.deliveryModel,
            managementModel: plan.managementModel
          })
        };
      }

      const project = await jiraApi.createProject(payload);

      return {
        ...toolText(`Created software project ${project.key ?? input.key}.`),
        structuredContent: {
          project,
          deliveryModel: plan.deliveryModel,
          managementModel: plan.managementModel,
          projectTemplateKey: plan.projectTemplateKey
        }
      };
    }
  );
}
