import { z } from "zod";

import { toolText } from "../lib/mcp.js";
import type { AdminCapabilityService } from "../services/admin-capability-service.js";

const fieldDefinitionSchema = z.object({
  fieldName: z.string().min(1),
  type: z.string().min(1).optional(),
  searcherKey: z.string().min(1).optional(),
  description: z.string().min(1).optional()
});

export function registerPlanFieldPolicyTool(
  server: { registerTool: Function },
  adminCapabilityService: AdminCapabilityService
) {
  server.registerTool(
    "plan_field_policy",
    {
      title: "Plan Jira field policy",
      description:
        "Inspect which fields are available for an issue type, which are missing, and where fallback or manual Jira admin steps are needed.",
      inputSchema: {
        projectKey: z.string().min(1),
        issueTypeName: z.string().min(1),
        requiredFields: z.array(z.string().min(1)).min(1),
        fieldDefinitions: z.array(fieldDefinitionSchema).optional()
      }
    },
    async (input: {
      projectKey: string;
      issueTypeName: string;
      requiredFields: string[];
      fieldDefinitions?: Array<{
        fieldName: string;
        type?: string;
        searcherKey?: string;
        description?: string;
      }>;
    }) => {
      const plan = await adminCapabilityService.planFieldPolicy(input);

      return {
        ...toolText(`Planned field policy for ${input.projectKey}.`),
        structuredContent: plan
      };
    }
  );
}
