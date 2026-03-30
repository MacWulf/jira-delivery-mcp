import { z } from "zod";

import { toolText } from "../lib/mcp.js";
import type { WorkflowAdminService } from "../services/workflow-admin-service.js";

export function registerPreviewStandardProjectWorkflowTool(
  server: { registerTool: Function },
  workflowAdminService: WorkflowAdminService
) {
  server.registerTool(
    "preview_standard_project_workflow",
    {
      title: "Preview standard project workflow",
      description:
        "Build and validate the standard Jira delivery workflow delta for a project without applying it.",
      inputSchema: {
        projectKey: z.string().min(1)
      }
    },
    async (input: { projectKey: string }) => {
      const result = await workflowAdminService.validateStandardTeamManagedWorkflow(
        input.projectKey
      );

      return {
        ...toolText(
          result.validation.errors.length === 0
            ? `Validated the standard workflow delta for ${input.projectKey}.`
            : `Validation returned ${result.validation.errors.length} issue(s) for ${input.projectKey}.`
        ),
        structuredContent: result
      };
    }
  );
}
