import { z } from "zod";

import { toolText } from "../lib/mcp.js";
import type { AdminCapabilityService } from "../services/admin-capability-service.js";

export function registerDiscoverIssueTypeCapabilitiesTool(
  server: { registerTool: Function },
  adminCapabilityService: AdminCapabilityService
) {
  server.registerTool(
    "discover_issue_type_capabilities",
    {
      title: "Discover Jira issue type capabilities",
      description:
        "Inspect the target project and report which issue types are available together with common bug and validation capability signals.",
      inputSchema: {
        projectKey: z.string().min(1)
      }
    },
    async (input: { projectKey: string }) => {
      const discovery = await adminCapabilityService.discoverIssueTypeCapabilities(
        input.projectKey
      );

      return {
        ...toolText(`Discovered issue type capabilities for ${input.projectKey}.`),
        structuredContent: discovery
      };
    }
  );
}
