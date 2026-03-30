import { z } from "zod";

import type { AppConfig } from "../config.js";
import { adfToPlainText, textToAdf } from "../domain/adf.js";
import { buildIssueDescriptionWithExecutionMetadata } from "../domain/issue-execution-metadata.js";
import { jsonRecordSchema, toolText } from "../lib/mcp.js";
import { buildDryRunResult, ensureWriteAllowed } from "../policy/write-policy.js";
import type { JiraApi } from "../services/jira-api.js";

const executionMetadataSchema = z.object({
  requiredSkills: z.array(z.string().min(1)).optional(),
  optionalSkills: z.array(z.string().min(1)).optional(),
  executionMode: z.string().min(1).optional(),
  notes: z.array(z.string().min(1)).optional()
});

export function registerUpdateIssueTool(
  server: { registerTool: Function },
  jiraApi: JiraApi,
  config: AppConfig
) {
  server.registerTool(
    "update_issue",
    {
      title: "Update Jira issue",
      description: "Update Jira issue fields.",
      inputSchema: {
        issueKey: z.string().min(1),
        summary: z.string().min(1).optional(),
        description: z.string().min(1).optional(),
        labels: z.array(z.string().min(1)).optional(),
        assigneeAccountId: z.string().min(1).optional(),
        executionMetadata: executionMetadataSchema.optional(),
        fields: jsonRecordSchema.optional(),
        confirm: z.boolean().optional()
      }
    },
    async (input: {
      issueKey: string;
      summary?: string;
      description?: string;
      labels?: string[];
      assigneeAccountId?: string;
      executionMetadata?: {
        requiredSkills?: string[];
        optionalSkills?: string[];
        executionMode?: string;
        notes?: string[];
      };
      fields?: Record<string, unknown>;
      confirm?: boolean;
    }) => {
      const fields: Record<string, unknown> = {
        ...input.fields
      };

      if (input.summary) {
        fields.summary = input.summary;
      }

      if (input.description || input.executionMetadata) {
        let currentDescription = input.description;

        if (currentDescription === undefined && input.executionMetadata) {
          const issue = await jiraApi.getIssue(input.issueKey, ["description"]);
          const issueFields =
            (issue.fields as Record<string, unknown> | undefined) ?? {};

          currentDescription = adfToPlainText(issueFields.description);
        }

        const nextDescription = buildIssueDescriptionWithExecutionMetadata(
          currentDescription,
          input.executionMetadata
        );

        if (nextDescription) {
          fields.description = textToAdf(nextDescription);
        }
      }

      if (input.labels) {
        fields.labels = input.labels;
      }

      if (input.assigneeAccountId) {
        fields.assignee = { accountId: input.assigneeAccountId };
      }

      if (Object.keys(fields).length === 0) {
        throw new Error("No fields provided to update.");
      }

      const writeMode = ensureWriteAllowed(
        config,
        "update_issue",
        input.confirm
      );

      if (writeMode.mode === "dry-run") {
        return {
          ...toolText(`Dry-run: would update issue ${input.issueKey}.`),
          structuredContent: buildDryRunResult("update_issue", {
            issueKey: input.issueKey,
            fields
          })
        };
      }

      await jiraApi.updateIssue({
        issueKey: input.issueKey,
        fields
      });

      return {
        ...toolText(`Updated issue ${input.issueKey}.`),
        structuredContent: {
          issueKey: input.issueKey,
          updatedFields: Object.keys(fields)
        }
      };
    }
  );
}
