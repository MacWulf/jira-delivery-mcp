import { z } from "zod";

import type { AppConfig } from "../config.js";
import { toolText } from "../lib/mcp.js";
import {
  buildDryRunResult,
  ensureWriteAllowed
} from "../policy/write-policy.js";
import type { AdminCapabilityService } from "../services/admin-capability-service.js";

export function registerEnsureCustomFieldAvailableTool(
  server: { registerTool: Function },
  adminCapabilityService: AdminCapabilityService,
  config: AppConfig
) {
  server.registerTool(
    "ensure_custom_field_available",
    {
      title: "Ensure Jira custom field availability",
      description:
        "Create a custom field when possible and report whether it is already available on the target project and issue type.",
      inputSchema: {
        projectKey: z.string().min(1).optional(),
        issueTypeName: z.string().min(1).optional(),
        fieldName: z.string().min(1),
        description: z.string().min(1).optional(),
        type: z.string().min(1).optional(),
        searcherKey: z.string().min(1).optional(),
        confirm: z.boolean().optional()
      }
    },
    async (input: {
      projectKey?: string;
      issueTypeName?: string;
      fieldName: string;
      description?: string;
      type?: string;
      searcherKey?: string;
      confirm?: boolean;
    }) => {
      const writeMode = ensureWriteAllowed(
        config,
        "create_custom_field",
        input.confirm
      );

      if (writeMode.mode === "dry-run") {
        return {
          ...toolText(`Dry-run: would ensure custom field '${input.fieldName}'.`),
          structuredContent: buildDryRunResult("create_custom_field", input)
        };
      }

      const result = await adminCapabilityService.ensureCustomFieldAvailable({
        fieldName: input.fieldName,
        ...(input.projectKey ? { projectKey: input.projectKey } : {}),
        ...(input.issueTypeName ? { issueTypeName: input.issueTypeName } : {}),
        ...(input.description ? { description: input.description } : {}),
        ...(input.type ? { type: input.type } : {}),
        ...(input.searcherKey ? { searcherKey: input.searcherKey } : {})
      });

      return {
        ...toolText(
          result.manualStepRequired
            ? `Ensured custom field '${input.fieldName}', but manual Jira admin work may still be required for target availability.`
            : `Custom field '${input.fieldName}' is available.`
        ),
        structuredContent: result
      };
    }
  );
}
