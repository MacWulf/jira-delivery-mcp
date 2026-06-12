import { z } from "zod";

import type { AppConfig } from "../config.js";
import { textToAdf } from "../domain/adf.js";
import {
  buildIssueDescriptionWithStructuredMetadata,
  parseIssueStructuredMetadataFromDescription,
  toStructuredMetadataInput
} from "../domain/issue-structured-metadata.js";
import { jsonRecordSchema, toolText } from "../lib/mcp.js";
import { buildDryRunResult, ensureWriteAllowed } from "../policy/write-policy.js";
import type { JiraApi } from "../services/jira-api.js";

const executionMetadataSchema = z.object({
  requiredSkills: z.array(z.string().min(1)).optional(),
  optionalSkills: z.array(z.string().min(1)).optional(),
  executionMode: z.string().min(1).optional(),
  notes: z.array(z.string().min(1)).optional()
});

const architectureMetadataSchema = z.object({
  adrUrl: z.string().min(1).optional(),
  adrTitle: z.string().min(1).optional(),
  adrStatus: z.string().min(1).optional(),
  architectureSummary: z.string().min(1).optional(),
  decisionScope: z.string().min(1).optional(),
  confidenceLevel: z.string().min(1).optional(),
  reviewMode: z.string().min(1).optional(),
  followUpType: z.string().min(1).optional(),
  migrationStyle: z.string().min(1).optional(),
  qualityAttributes: z.array(z.string().min(1)).optional(),
  hardConstraints: z.array(z.string().min(1)).optional(),
  cleanupRequired: z.boolean().optional(),
  technicalDebtFlag: z.boolean().optional(),
  architectureBlockReason: z.string().optional(),
  nextSkills: z.array(z.string().min(1)).optional()
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
        architectureMetadata: architectureMetadataSchema.optional(),
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
      architectureMetadata?: {
        adrUrl?: string;
        adrTitle?: string;
        adrStatus?: string;
        architectureSummary?: string;
        decisionScope?: string;
        confidenceLevel?: string;
        reviewMode?: string;
        followUpType?: string;
        migrationStyle?: string;
        qualityAttributes?: string[];
        hardConstraints?: string[];
        cleanupRequired?: boolean;
        technicalDebtFlag?: boolean;
        architectureBlockReason?: string;
        nextSkills?: string[];
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

      if (
        input.description !== undefined ||
        input.executionMetadata !== undefined ||
        input.architectureMetadata !== undefined
      ) {
        let currentDescription = input.description;
        let currentStructuredMetadata = toStructuredMetadataInput({});

        if (
          currentDescription === undefined ||
          input.executionMetadata === undefined ||
          input.architectureMetadata === undefined
        ) {
          const issue = await jiraApi.getIssue(input.issueKey, ["description"]);
          const issueFields =
            (issue.fields as Record<string, unknown> | undefined) ?? {};
          const parsedDescription = parseIssueStructuredMetadataFromDescription(
            issueFields.description
          );

          currentDescription ??= parsedDescription.descriptionText;
          currentStructuredMetadata = toStructuredMetadataInput(
            parsedDescription
          );
        }

        const nextDescription = buildIssueDescriptionWithStructuredMetadata(
          currentDescription,
          {
            ...(input.executionMetadata ??
            currentStructuredMetadata.executionMetadata
              ? {
                  executionMetadata:
                    input.executionMetadata ??
                    currentStructuredMetadata.executionMetadata
                }
              : {}),
            ...(input.architectureMetadata ??
            currentStructuredMetadata.architectureMetadata
              ? {
                  architectureMetadata:
                    input.architectureMetadata ??
                    currentStructuredMetadata.architectureMetadata
                }
              : {})
          }
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
