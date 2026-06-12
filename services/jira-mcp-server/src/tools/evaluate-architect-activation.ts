import { z } from "zod";

import { parseIssueStructuredMetadataFromDescription } from "../domain/issue-structured-metadata.js";
import { evaluateArchitectActivation } from "../domain/architect-activation.js";
import { toolText } from "../lib/mcp.js";
import type { JiraApi } from "../services/jira-api.js";

export function registerEvaluateArchitectActivationTool(
  server: { registerTool: Function },
  jiraApi: JiraApi
) {
  server.registerTool(
    "evaluate_architect_activation",
    {
      title: "Evaluate Architect activation",
      description:
        "Evaluate whether Architect should activate for a Jira issue based on issue context and existing metadata.",
      inputSchema: {
        issueKey: z.string().min(1)
      }
    },
    async (input: { issueKey: string }) => {
      const issue = await jiraApi.getIssue(input.issueKey, [
        "summary",
        "description",
        "labels",
        "issuetype"
      ]);
      const issueFields =
        (issue.fields as Record<string, unknown> | undefined) ?? {};
      const parsedMetadata = parseIssueStructuredMetadataFromDescription(
        issueFields.description
      );
      const labels = Array.isArray(issueFields.labels)
        ? issueFields.labels.filter(
            (value): value is string => typeof value === "string"
          )
        : [];
      const issueTypeName =
        typeof (issueFields.issuetype as { name?: unknown } | undefined)?.name ===
        "string"
          ? ((issueFields.issuetype as { name?: string }).name ?? undefined)
          : undefined;
      const activation = evaluateArchitectActivation({
        ...(typeof issueFields.summary === "string"
          ? { summary: issueFields.summary }
          : {}),
        ...(parsedMetadata.descriptionText
          ? { descriptionText: parsedMetadata.descriptionText }
          : {}),
        ...(labels.length ? { labels } : {}),
        ...(issueTypeName ? { issueTypeName } : {}),
        ...(parsedMetadata.architectureMetadata
          ? { architectureMetadata: parsedMetadata.architectureMetadata }
          : {})
      });

      return {
        ...toolText(`Evaluated Architect activation for ${input.issueKey}.`),
        structuredContent: {
          issueKey: input.issueKey,
          activation,
          architectureMetadata: parsedMetadata.architectureMetadata,
          executionMetadata: parsedMetadata.executionMetadata
        }
      };
    }
  );
}
