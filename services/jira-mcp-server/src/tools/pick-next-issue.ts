import { z } from "zod";

import type { AppConfig } from "../config.js";
import { evaluateArchitectActivation } from "../domain/architect-activation.js";
import { parseIssueStructuredMetadataFromDescription } from "../domain/issue-structured-metadata.js";
import { toolText } from "../lib/mcp.js";
import {
  buildIssueSelectionReason,
  hasOpenBlockingDependency,
  isWorkflowBlockedIssue,
  isDoneIssue,
  type JiraIssueForSelection
} from "../policy/assistant-policy.js";
import { buildIssueDependencySnapshot } from "../policy/dependency-policy.js";
import { buildDependencyStatusSignals } from "../policy/dependency-status-policy.js";
import { buildDependencyImpactSummary } from "../policy/dependency-impact-policy.js";
import {
  buildExecutionOrdering,
  buildExecutionOrderingReason,
  compareIssuesForExecution
} from "../policy/execution-selection-policy.js";
import {
  evaluateIssueReadiness,
  summarizeReadinessFailures
} from "../policy/readiness-policy.js";
import type { JiraApi } from "../services/jira-api.js";

const DEFAULT_FIELDS = [
  "summary",
  "description",
  "status",
  "priority",
  "labels",
  "issuetype",
  "parent",
  "issuelinks"
];

export function registerPickNextIssueTool(
  server: { registerTool: Function },
  jiraApi: JiraApi,
  config: AppConfig
) {
  server.registerTool(
    "pick_next_issue",
    {
      title: "Pick next Jira issue",
      description:
        "Select the next issue to work on from a configured or supplied JQL query.",
      inputSchema: {
        jql: z.string().min(1).optional()
      }
    },
    async (input: { jql?: string }) => {
      const jql = input.jql ?? config.defaultPickNextJql;

      if (!jql) {
        throw new Error(
          "Missing jql and no JIRA_DEFAULT_PICK_NEXT_JQL is configured."
        );
      }

      const result = await jiraApi.searchIssues({
        jql,
        maxResults: 50,
        fields: DEFAULT_FIELDS
      });

      const candidateIssues = (result.issues as JiraIssueForSelection[]).filter(
        (issue) => !isDoneIssue(issue)
      );
      const workflowBlockedIssues = candidateIssues.filter((issue) =>
        isWorkflowBlockedIssue(issue)
      );
      const blockedIssues = candidateIssues.filter((issue) =>
        hasOpenBlockingDependency(issue)
      );
      const readinessEvaluations = candidateIssues.map((issue) => ({
        issue,
        readiness: evaluateIssueReadiness(issue, "start")
      }));
      const notReadyIssues = readinessEvaluations
        .filter(({ readiness }) => !readiness.passed)
        .map(({ issue, readiness }) => ({
          issueKey: issue.key,
          summary: issue.fields?.summary,
          readiness,
          reason: summarizeReadinessFailures(readiness),
          dependencyStatusSignals: buildDependencyStatusSignals(issue),
          dependencyImpactSummary: buildDependencyImpactSummary(issue),
          dependencySnapshot: buildIssueDependencySnapshot(issue)
        }));
      const issues = candidateIssues
        .filter(
          (issue) =>
            !hasOpenBlockingDependency(issue) && !isWorkflowBlockedIssue(issue)
        )
        .filter((issue) => evaluateIssueReadiness(issue, "start").passed)
        .sort(compareIssuesForExecution);

      const nextIssue = issues[0];
      const nextIssueMetadata = nextIssue
        ? parseIssueStructuredMetadataFromDescription(
            (nextIssue.fields as Record<string, unknown> | undefined)?.description
          )
        : undefined;

      if (!nextIssue?.key) {
        return {
          ...toolText("No eligible issue found."),
          structuredContent: {
            selected: null,
            blockedCandidates: blockedIssues.map((issue) => ({
              issueKey: issue.key,
              summary: issue.fields?.summary,
              dependencyStatusSignals: buildDependencyStatusSignals(issue),
              dependencyImpactSummary: buildDependencyImpactSummary(issue),
              dependencySnapshot: buildIssueDependencySnapshot(issue)
            })),
            workflowBlockedCandidates: workflowBlockedIssues.map((issue) => ({
              issueKey: issue.key,
              summary: issue.fields?.summary,
              executionOrdering: buildExecutionOrdering(issue),
              dependencyStatusSignals: buildDependencyStatusSignals(issue),
              dependencyImpactSummary: buildDependencyImpactSummary(issue),
              dependencySnapshot: buildIssueDependencySnapshot(issue)
            })),
            notReadyCandidates: notReadyIssues
          }
        };
      }

      return {
        ...toolText(`Selected ${nextIssue.key} as the next issue.`),
        structuredContent: {
          selected: nextIssue,
          reason: `${buildIssueSelectionReason(nextIssue)}. ${buildExecutionOrderingReason(nextIssue)}`,
          executionOrdering: buildExecutionOrdering(nextIssue),
          dependencyStatusSignals: buildDependencyStatusSignals(nextIssue),
          dependencyImpactSummary: buildDependencyImpactSummary(nextIssue),
          dependencySnapshot: buildIssueDependencySnapshot(nextIssue),
          blockedCandidates: blockedIssues.map((issue) => ({
            issueKey: issue.key,
            summary: issue.fields?.summary,
            executionOrdering: buildExecutionOrdering(issue),
            dependencyStatusSignals: buildDependencyStatusSignals(issue),
            dependencyImpactSummary: buildDependencyImpactSummary(issue),
            dependencySnapshot: buildIssueDependencySnapshot(issue)
          })),
          workflowBlockedCandidates: workflowBlockedIssues.map((issue) => ({
            issueKey: issue.key,
            summary: issue.fields?.summary,
            executionOrdering: buildExecutionOrdering(issue),
            dependencyStatusSignals: buildDependencyStatusSignals(issue),
            dependencyImpactSummary: buildDependencyImpactSummary(issue),
            dependencySnapshot: buildIssueDependencySnapshot(issue)
          })),
          notReadyCandidates: notReadyIssues,
          readinessEvaluation: evaluateIssueReadiness(nextIssue, "start"),
          executionMetadata: nextIssueMetadata?.executionMetadata,
          architectureMetadata: nextIssueMetadata?.architectureMetadata,
          architectActivation: evaluateArchitectActivation({
            ...(nextIssue.fields?.summary
              ? { summary: nextIssue.fields.summary }
              : {}),
            ...(nextIssueMetadata?.descriptionText
              ? { descriptionText: nextIssueMetadata.descriptionText }
              : {}),
            ...(nextIssue.fields?.labels
              ? { labels: nextIssue.fields.labels }
              : {}),
            ...(nextIssueMetadata?.architectureMetadata
              ? { architectureMetadata: nextIssueMetadata.architectureMetadata }
              : {})
          })
        }
      };
    }
  );
}
