import { z } from "zod";

import { parseIssueExecutionMetadataFromDescription } from "../domain/issue-execution-metadata.js";
import { toolText } from "../lib/mcp.js";
import { buildIssueDependencySnapshot, type IssueDependencySnapshot } from "../policy/dependency-policy.js";
import { buildDependencyStatusSignals } from "../policy/dependency-status-policy.js";
import { buildDependencyImpactSummary } from "../policy/dependency-impact-policy.js";
import type { JiraIssueForSelection } from "../policy/assistant-policy.js";
import type { JiraApi } from "../services/jira-api.js";

export function registerGetIssueTool(
  server: { registerTool: Function },
  jiraApi: JiraApi
) {
  server.registerTool(
    "get_issue",
    {
      title: "Get Jira issue",
      description: "Fetch a Jira issue with selected fields.",
      inputSchema: {
        issueKey: z.string().min(1),
        fields: z.array(z.string().min(1)).optional()
      }
    },
    async (input: {
      issueKey: string;
      fields?: string[];
    }) => {
      const issue = await jiraApi.getIssue(input.issueKey, input.fields);
      const issueFields =
        (issue.fields as Record<string, unknown> | undefined) ?? {};
      const parsedExecutionData = parseIssueExecutionMetadataFromDescription(
        issueFields.description
      );

      return {
        ...toolText(`Fetched issue ${input.issueKey}.`),
        structuredContent: {
          issue,
          descriptionText: parsedExecutionData.descriptionText,
          executionMetadata: parsedExecutionData.executionMetadata,
          dependencyStatusSignals: buildDependencyStatusSignals(
            issue as JiraIssueForSelection
          ),
          dependencyImpactSummary: buildDependencyImpactSummary(
            issue as JiraIssueForSelection
          ),
          dependencySnapshot: buildIssueDependencySnapshot(
            issue as JiraIssueForSelection
          ) as IssueDependencySnapshot
        }
      };
    }
  );
}
