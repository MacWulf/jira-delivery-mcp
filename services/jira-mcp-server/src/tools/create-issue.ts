import { z } from "zod";

import type { AppConfig } from "../config.js";
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

export function registerCreateIssueTool(
  server: { registerTool: Function },
  jiraApi: JiraApi,
  config: AppConfig
) {
  server.registerTool(
    "create_issue",
    {
      title: "Create Jira issue",
      description:
        "Create a Jira issue in the configured project or a provided project.",
      inputSchema: {
        projectKey: z.string().min(1).optional(),
        issueType: z.string().min(1),
        summary: z.string().min(1),
        description: z.string().min(1).optional(),
        labels: z.array(z.string().min(1)).optional(),
        assigneeAccountId: z.string().min(1).optional(),
        parentIssueKey: z.string().min(1).optional(),
        executionMetadata: executionMetadataSchema.optional(),
        fields: jsonRecordSchema.optional(),
        confirm: z.boolean().optional()
      }
    },
    async (input: {
      projectKey?: string;
      issueType: string;
      summary: string;
      description?: string;
      labels?: string[];
      assigneeAccountId?: string;
      parentIssueKey?: string;
      executionMetadata?: {
        requiredSkills?: string[];
        optionalSkills?: string[];
        executionMode?: string;
        notes?: string[];
      };
      fields?: Record<string, unknown>;
      confirm?: boolean;
    }) => {
      const projectKey = input.projectKey ?? config.defaultProjectKey;

      if (!projectKey) {
        throw new Error(
          "Missing projectKey and no JIRA_DEFAULT_PROJECT_KEY is configured."
        );
      }

      const writeMode = ensureWriteAllowed(
        config,
        "create_issue",
        input.confirm
      );

      if (writeMode.mode === "dry-run") {
        return {
          ...toolText(`Dry-run: would create issue in ${projectKey}.`),
          structuredContent: buildDryRunResult("create_issue", {
            ...input,
            projectKey
          })
        };
      }

      const payload: {
        projectKey: string;
        issueType: string;
        summary: string;
        description?: string;
        labels?: string[];
        assigneeAccountId?: string;
        parentIssueKey?: string;
        fields?: Record<string, unknown>;
      } = {
        projectKey,
        issueType: input.issueType,
        summary: input.summary
      };

      const description = buildIssueDescriptionWithExecutionMetadata(
        input.description,
        input.executionMetadata
      );

      if (description) {
        payload.description = description;
      }

      if (input.labels) {
        payload.labels = input.labels;
      }

      if (input.assigneeAccountId) {
        payload.assigneeAccountId = input.assigneeAccountId;
      }

      if (input.parentIssueKey) {
        payload.parentIssueKey = input.parentIssueKey;
      }

      if (input.fields) {
        payload.fields = input.fields;
      }

      const issue = await jiraApi.createIssue(payload);

      return {
        ...toolText(`Created issue ${issue.key}.`),
        structuredContent: issue
      };
    }
  );
}
