import type {
  IssueBlockEdge,
  IssueDependencySnapshot
} from "../policy/dependency-policy.js";
import { inferWorkflowSemantic } from "../policy/workflow-semantics.js";

export type ChangeClassification =
  | "change_request"
  | "bug"
  | "reopen"
  | "new_scope"
  | "ambiguous";

export type ChangeClassificationConfidence = "low" | "medium" | "high";

export type ChangeImpactAction =
  | "monitor"
  | "reopen_candidate"
  | "split_candidate"
  | "relink_review";

export type ChangeReleaseRisk = "low" | "medium" | "high";

export type ChangeOperationType =
  | "transition_issue"
  | "update_issue"
  | "create_issue"
  | "link_issues"
  | "delete_issue_link"
  | "add_comment"
  | "manual_step";

export type ChangeApprovalRisk = "low" | "medium" | "high" | "critical";

export type ChangeDecisionLogEntry = {
  title: string;
  summary: string;
  detailLines: string[];
  body: string;
  relatedIssueKeys: string[];
};

export type ChangeClassificationResult = {
  issueKey?: string;
  summary: string;
  description?: string;
  classification: ChangeClassification;
  confidence: ChangeClassificationConfidence;
  reasons: string[];
  decisionPoints: string[];
  context?: {
    statusName?: string;
    semantic: ReturnType<typeof inferWorkflowSemantic>;
    issueTypeName?: string;
    parentIssueKey?: string;
    projectKey?: string;
  };
  dependencySnapshot?: IssueDependencySnapshot;
};

export type ChangeImpactRelationship =
  | "self"
  | "parent"
  | "blocked_by"
  | "blocks"
  | "related"
  | "explicit";

export type ChangeImpactIssue = {
  issueKey: string;
  summary?: string;
  statusName?: string;
  relation: ChangeImpactRelationship;
  semantic: ReturnType<typeof inferWorkflowSemantic>;
  recommendedAction: ChangeImpactAction;
};

export type ChangeImpactAnalysis = {
  issueKey?: string;
  classification: ChangeClassification;
  projectKey?: string;
  changeSummary: string;
  affectedIssues: ChangeImpactIssue[];
  dependencyEdges: IssueBlockEdge[];
  releaseRisk: ChangeReleaseRisk;
  notes: string[];
};

export type PlannedChangeOperation = {
  type: ChangeOperationType;
  reason: string;
  highImpact: boolean;
  payload: Record<string, unknown>;
};

export type ChangeApprovalGate = {
  approvalRequired: boolean;
  riskLevel: ChangeApprovalRisk;
  reasons: string[];
  recommendedAction: string;
};

export type ChangeExecutionPlan = {
  issueKey: string;
  classification: ChangeClassification;
  projectKey?: string;
  impactAnalysis: ChangeImpactAnalysis;
  approvalGate: ChangeApprovalGate;
  operations: PlannedChangeOperation[];
  decisionLog: ChangeDecisionLogEntry;
  manualStepsRequired: boolean;
  notes: string[];
};

export function buildChangeDecisionLogEntry(input: {
  issueKey?: string;
  classification: ChangeClassification;
  changeSummary: string;
  releaseRisk: ChangeReleaseRisk;
  approvalRequired: boolean;
  affectedIssueKeys: string[];
  operationSummaries: string[];
  notes: string[];
}): ChangeDecisionLogEntry {
  const title = input.issueKey
    ? `Change decision for ${input.issueKey}`
    : "Change decision";
  const relatedIssueKeys = dedupe(
    [input.issueKey, ...input.affectedIssueKeys].filter(Boolean) as string[]
  );
  const detailLines = [
    `Classification: ${input.classification}`,
    `Release risk: ${input.releaseRisk}`,
    `Approval required: ${input.approvalRequired ? "yes" : "no"}`,
    `Affected issues: ${
      relatedIssueKeys.length > 0 ? relatedIssueKeys.join(", ") : "none"
    }`,
    `Planned operations: ${
      input.operationSummaries.length > 0
        ? input.operationSummaries.join("; ")
        : "none"
    }`,
    ...input.notes.map((note) => `Note: ${note}`)
  ];
  const summary = `${input.changeSummary} -> ${input.classification}`;
  const body = [
    title,
    "",
    `Summary: ${summary}`,
    ...detailLines.map((line) => `- ${line}`)
  ].join("\n");

  return {
    title,
    summary,
    detailLines,
    body,
    relatedIssueKeys
  };
}

export function buildChangeDecisionLogBody(input: {
  classification: ChangeClassification;
  confidence: ChangeClassificationConfidence;
  releaseRisk: ChangeReleaseRisk;
  approvalGate: ChangeApprovalGate;
  impactIssueKeys: string[];
  operations: PlannedChangeOperation[];
  changeSummary: string;
  changeDescription?: string;
  approvalNote?: string;
  approvedBy?: string;
}): string {
  return [
    `Change decision log: ${input.changeSummary}`,
    "",
    `Classification: ${input.classification} (${input.confidence})`,
    `Release risk: ${input.releaseRisk}`,
    `Approval required: ${input.approvalGate.approvalRequired ? "yes" : "no"}`,
    input.approvalGate.reasons.length
      ? `Approval reasons: ${input.approvalGate.reasons.join("; ")}`
      : "",
    input.approvedBy ? `Approved by: ${input.approvedBy}` : "",
    input.approvalNote ? `Approval note: ${input.approvalNote}` : "",
    input.impactIssueKeys.length
      ? `Affected issues: ${input.impactIssueKeys.join(", ")}`
      : "Affected issues: none recorded",
    "",
    "Planned Jira operations:",
    ...(input.operations.length
      ? input.operations.map(
          (operation, index) =>
            `${index + 1}. ${operation.type}: ${operation.reason}`
        )
      : ["1. No Jira mutations planned."]),
    input.changeDescription ? "" : "",
    input.changeDescription ? "Change description:" : "",
    input.changeDescription ?? ""
  ]
    .filter(Boolean)
    .join("\n");
}

export function normalizeChangeText(...values: Array<string | undefined>): string {
  return values
    .filter(Boolean)
    .join("\n")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function containsAnyChangeKeyword(
  text: string,
  keywords: string[]
): boolean {
  return keywords.some((keyword) => text.includes(keyword));
}

export function dedupe<T>(values: T[]): T[] {
  return [...new Set(values)];
}
