import { z } from "zod";

import { toolText } from "../lib/mcp.js";
import {
  buildDryRunResult,
  ensureWriteAllowed
} from "../policy/write-policy.js";
import type { AppConfig } from "../config.js";
import type { WorkflowAdminService } from "../services/workflow-admin-service.js";

export function registerApplyStandardProjectWorkflowTool(
  server: { registerTool: Function },
  workflowAdminService: WorkflowAdminService,
  config: AppConfig
) {
  server.registerTool(
    "apply_standard_project_workflow",
    {
      title: "Apply standard project workflow",
      description:
        "Ensure the standard Jira delivery workflow statuses exist, validate the workflow delta, and publish it to the target project.",
      inputSchema: {
        projectKey: z.string().min(1),
        confirm: z.boolean().optional()
      }
    },
    async (input: { projectKey: string; confirm?: boolean }) => {
      const write = ensureWriteAllowed(
        config,
        "update_workflow",
        input.confirm
      );
      const validation =
        await workflowAdminService.validateStandardTeamManagedWorkflow(
          input.projectKey
        );

      if (write.mode === "dry-run") {
        return {
          ...toolText(
            `Dry-run only. Workflow update for ${input.projectKey} was planned but not published.`
          ),
          structuredContent: buildDryRunResult("update_workflow", validation)
        };
      }

      if (validation.validation.errors.length > 0) {
        throw new Error(
          `Workflow validation failed for ${input.projectKey}: ${validation.validation.errors
            .map((error) => `${error.code}: ${error.message}`)
            .join("; ")}`
        );
      }

      const result = await workflowAdminService.applyStandardTeamManagedWorkflow(
        input.projectKey
      );

      return {
        ...toolText(
          `Applied the standard workflow to ${input.projectKey}.`
        ),
        structuredContent: result
      };
    }
  );
}
