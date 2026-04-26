import { z } from "zod";

import { toolText } from "../lib/mcp.js";
import type { AdminCapabilityService } from "../services/admin-capability-service.js";

export function registerPlanIssueTypeEnablementTool(
  server: { registerTool: Function },
  adminCapabilityService: AdminCapabilityService
) {
  server.registerTool(
    "plan_issue_type_enablement",
    {
      title: "Plan Jira issue type enablement",
      description:
        "Plan whether requested issue types are already available, may be created safely, or require manual Jira administration.",
      inputSchema: {
        projectKey: z.string().min(1),
        requestedIssueTypes: z.array(z.string().min(1)).min(1)
      }
    },
    async (input: { projectKey: string; requestedIssueTypes: string[] }) => {
      const plan = await adminCapabilityService.planIssueTypeEnablement(
        input.projectKey,
        input.requestedIssueTypes
      );

      return {
        ...toolText(`Planned issue type enablement for ${input.projectKey}.`),
        structuredContent: plan
      };
    }
  );
}
