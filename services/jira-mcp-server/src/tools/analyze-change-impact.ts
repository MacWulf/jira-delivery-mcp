import { z } from "zod";

import { toolText } from "../lib/mcp.js";
import type { ChangeControlService } from "../services/change-control-service.js";

const changeClassificationSchema = z.enum([
  "change_request",
  "bug",
  "reopen",
  "new_scope",
  "ambiguous"
]);

export function registerAnalyzeChangeImpactTool(
  server: { registerTool: Function },
  changeControlService: ChangeControlService
) {
  server.registerTool(
    "analyze_change_impact",
    {
      title: "Analyze change impact",
      description:
        "Analyze the issue, dependency, and release-order impact of an incoming change without mutating Jira.",
      inputSchema: {
        issueKey: z.string().min(1).optional(),
        summary: z.string().min(1),
        description: z.string().min(1).optional(),
        classification: changeClassificationSchema.optional(),
        relatedIssueKeys: z.array(z.string().min(1)).optional()
      }
    },
    async (input: {
      issueKey?: string;
      summary: string;
      description?: string;
      classification?:
        | "change_request"
        | "bug"
        | "reopen"
        | "new_scope"
        | "ambiguous";
      relatedIssueKeys?: string[];
    }) => {
      const result = await changeControlService.analyzeChangeImpact(input);

      return {
        ...toolText(`Planned change impact with ${result.releaseRisk} release risk.`),
        structuredContent: result
      };
    }
  );
}
