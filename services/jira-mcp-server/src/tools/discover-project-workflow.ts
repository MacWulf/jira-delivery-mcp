import { z } from "zod";

import { toolText } from "../lib/mcp.js";
import type { WorkflowDiscoveryService } from "../services/workflow-discovery-service.js";

export function registerDiscoverProjectWorkflowTool(
  server: { registerTool: Function },
  workflowDiscoveryService: WorkflowDiscoveryService
) {
  server.registerTool(
    "discover_project_workflow",
    {
      title: "Discover Jira project workflow",
      description:
        "Build a project-level workflow discovery snapshot with statuses, sampled transitions, semantic buckets, and transition policy hints.",
      inputSchema: {
        projectKey: z.string().min(1)
      }
    },
    async (input: { projectKey: string }) => {
      const snapshot = await workflowDiscoveryService.discoverProjectWorkflow(
        input.projectKey
      );

      return {
        ...toolText(`Discovered workflow snapshot for ${input.projectKey}.`),
        structuredContent: snapshot
      };
    }
  );
}
