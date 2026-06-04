import { z } from "zod";

import { evaluateArchitectActivation } from "../domain/architect-activation.js";
import { parseIssueStructuredMetadataFromDescription } from "../domain/issue-structured-metadata.js";
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
      const parsedMetadata = parseIssueStructuredMetadataFromDescription(
        issueFields.description
      );

      return {
        ...toolText(`Fetched issue ${input.issueKey}.`),
        structuredContent: {
          issue,
          descriptionText: parsedMetadata.descriptionText,
          executionMetadata: parsedMetadata.executionMetadata,
          architectureMetadata: parsedMetadata.architectureMetadata,
          architectActivation: evaluateArchitectActivation({
            ...(typeof issueFields.summary === "string"
              ? { summary: issueFields.summary }
              : {}),
            ...(parsedMetadata.descriptionText
              ? { descriptionText: parsedMetadata.descriptionText }
              : {}),
            ...(Array.isArray(issueFields.labels)
              ? {
                  labels: issueFields.labels.filter(
                    (value): value is string => typeof value === "string"
                  )
                }
              : {}),
            ...(parsedMetadata.architectureMetadata
              ? { architectureMetadata: parsedMetadata.architectureMetadata }
              : {})
          }),
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
