import { z } from "zod";

import type { AppConfig } from "../config.js";
import { toolText } from "../lib/mcp.js";
import {
  buildDryRunResult,
  ensureWriteAllowed
} from "../policy/write-policy.js";
import type { AdminCapabilityService } from "../services/admin-capability-service.js";

export function registerEnsureIssueTypeAvailableTool(
  server: { registerTool: Function },
  adminCapabilityService: AdminCapabilityService,
  config: AppConfig
) {
  server.registerTool(
    "ensure_issue_type_available",
    {
      title: "Ensure Jira issue type availability",
      description:
        "Create an issue type when possible and report whether the target project can use it directly or still needs a manual Jira admin step.",
      inputSchema: {
        projectKey: z.string().min(1),
        issueTypeName: z.string().min(1),
        description: z.string().min(1).optional(),
        type: z.enum(["standard", "subtask"]).optional(),
        hierarchyLevel: z.number().int().min(-1).max(1).optional(),
        confirm: z.boolean().optional()
      }
    },
    async (input: {
      projectKey: string;
      issueTypeName: string;
      description?: string;
      type?: "standard" | "subtask";
      hierarchyLevel?: number;
      confirm?: boolean;
    }) => {
      const existingPlan = await adminCapabilityService.planIssueTypeEnablement(
        input.projectKey,
        [input.issueTypeName]
      );
      const capability = existingPlan.capabilities[0];

      if (capability?.available) {
        return {
          ...toolText(
            `Issue type '${input.issueTypeName}' is already available in ${input.projectKey}.`
          ),
          structuredContent: {
            ...existingPlan,
            capability
          }
        };
      }

      const writeMode = ensureWriteAllowed(
        config,
        "create_issue_type",
        input.confirm
      );

      if (writeMode.mode === "dry-run") {
        return {
          ...toolText(
            `Dry-run: would attempt to create issue type '${input.issueTypeName}'.`
          ),
          structuredContent: buildDryRunResult("create_issue_type", {
            ...input,
            existingPlan
          })
        };
      }

      const result = await adminCapabilityService.ensureIssueTypeAvailable(
        {
          projectKey: input.projectKey,
          issueTypeName: input.issueTypeName,
          ...(input.description ? { description: input.description } : {}),
          ...(input.type ? { type: input.type } : {}),
          ...(input.hierarchyLevel !== undefined
            ? { hierarchyLevel: input.hierarchyLevel }
            : {})
        }
      );

      return {
        ...toolText(
          result.manualStepRequired
            ? `Created issue type '${input.issueTypeName}', but ${input.projectKey} may still require a manual Jira admin step.`
            : `Issue type '${input.issueTypeName}' is now available for ${input.projectKey}.`
        ),
        structuredContent: result
      };
    }
  );
}
