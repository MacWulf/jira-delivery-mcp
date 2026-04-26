import { z } from "zod";

import { toolText } from "../lib/mcp.js";
import type { ChangeControlService } from "../services/change-control-service.js";

export function registerClassifyIncomingChangeTool(
  server: { registerTool: Function },
  changeControlService: ChangeControlService
) {
  server.registerTool(
    "classify_incoming_change",
    {
      title: "Classify incoming change",
      description:
        "Classify an incoming change as change_request, bug, reopen, new_scope, or ambiguous without mutating Jira.",
      inputSchema: {
        issueKey: z.string().min(1).optional(),
        summary: z.string().min(1),
        description: z.string().min(1).optional()
      }
    },
    async (input: {
      issueKey?: string;
      summary: string;
      description?: string;
    }) => {
      const result = await changeControlService.classifyIncomingChange(input);

      return {
        ...toolText(`Classified the incoming change as ${result.classification}.`),
        structuredContent: result
      };
    }
  );
}
