import { z } from "zod";

import { toolText } from "../lib/mcp.js";
import type { IssueReadinessStage } from "../policy/readiness-policy.js";
import type { ReadinessPolicyService } from "../services/readiness-policy-service.js";

export function registerEvaluateIssueReadinessTool(
  server: { registerTool: Function },
  readinessPolicyService: ReadinessPolicyService
) {
  server.registerTool(
    "evaluate_issue_readiness",
    {
      title: "Evaluate Jira issue readiness",
      description:
        "Evaluate whether an issue is ready for selection, active work, handoff, or closure according to the readiness policy.",
      inputSchema: {
        issueKey: z.string().min(1),
        stage: z
          .enum(["select", "start", "handoff", "close"])
          .default("start")
      }
    },
    async (input: {
      issueKey: string;
      stage: IssueReadinessStage;
    }) => {
      const evaluation = await readinessPolicyService.evaluateIssue(
        input.issueKey,
        input.stage
      );

      return {
        ...toolText(
          evaluation.passed
            ? `${input.issueKey} is ready for ${input.stage}.`
            : `${input.issueKey} is not ready for ${input.stage}.`
        ),
        structuredContent: evaluation
      };
    }
  );
}
