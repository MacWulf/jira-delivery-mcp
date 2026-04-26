import type { WorkflowSemantic } from "../policy/workflow-semantics.js";

export type ReconciliationSemantic =
  | Exclude<WorkflowSemantic, "unknown">
  | "human_testing";

export type ReconciliationRiskLevel = "low" | "medium" | "high";

export type ReconciliationStatus =
  | "already_aligned"
  | "ready_to_apply"
  | "blocked";

export type ReconciliationBlockCategory =
  | "unsupported_current_state"
  | "unsafe_without_confirmation"
  | "dependency_or_quality_gate"
  | "missing_workflow_path"
  | "human_gate"
  | "ambiguous_actual_state"
  | "tenant_or_api_limitation"
  | "manual_jira_step_required";

export type ReconciliationPathStep = {
  index: number;
  fromSemantic: WorkflowSemantic | "human_testing";
  toSemantic: ReconciliationSemantic;
  transitionName: string;
  transitionId?: string;
  source: "current-issue" | "workflow-snapshot";
};

export type ReconciliationReadinessSignal = {
  stage: "select" | "start" | "handoff" | "close";
  passed: boolean;
  failedCheckCodes: string[];
};

export type IssueStateReconciliationPlan = {
  issueKey: string;
  summary?: string;
  projectKey?: string;
  status: ReconciliationStatus;
  currentStatusName?: string;
  currentSemantic: WorkflowSemantic;
  inferredActualSemantic: ReconciliationSemantic | "unknown";
  targetSemantic?: ReconciliationSemantic;
  targetStatusNameHint?: string;
  targetSource:
    | "already-aligned"
    | "workflow-inference"
    | "caller-hint"
    | "ambiguous";
  reason: string;
  pathKind: "none" | "single-hop" | "multi-hop";
  path: ReconciliationPathStep[];
  riskLevel: ReconciliationRiskLevel;
  confirmationRequired: boolean;
  manualStepRequired: boolean;
  blockCategory?: ReconciliationBlockCategory;
  bypassedChecks: string[];
  readinessSignals: ReconciliationReadinessSignal[];
  notes: string[];
};

export type IssueStateReconciliationApplyResult =
  IssueStateReconciliationPlan & {
    applied: boolean;
    statusBefore?: string;
    statusAfter?: string;
    semanticAfter?: WorkflowSemantic | "human_testing";
    executedPath: ReconciliationPathStep[];
    auditComment: string;
  };

export const RECONCILIATION_SEMANTICS: ReconciliationSemantic[] = [
  "backlog",
  "todo",
  "ready",
  "in_progress",
  "review",
  "qa",
  "human_testing",
  "blocked",
  "done",
  "canceled"
];

export function isReconciliationSemantic(
  value: string | undefined
): value is ReconciliationSemantic {
  return RECONCILIATION_SEMANTICS.includes(value as ReconciliationSemantic);
}

export function buildReconciliationAuditComment(input: {
  issueKey: string;
  statusBefore?: string;
  statusAfter?: string;
  currentSemantic: WorkflowSemantic;
  targetSemantic?: ReconciliationSemantic;
  reason: string;
  path: ReconciliationPathStep[];
  bypassedChecks: string[];
}): string {
  const pathText =
    input.path.length > 0
      ? input.path.map((step) => step.transitionName).join(" -> ")
      : "no transition";

  return [
    `Workflow state reconciliation applied for ${input.issueKey}.`,
    "",
    `Status before: ${input.statusBefore ?? "unknown"} (${input.currentSemantic})`,
    `Status after: ${input.statusAfter ?? "unknown"} (${input.targetSemantic ?? "unknown"})`,
    `Reason: ${input.reason}`,
    `Path: ${
      input.path.length > 1 ? `multi-hop via ${pathText}` : `direct via ${pathText}`
    }`,
    input.bypassedChecks.length > 0
      ? `Bypassed checks: ${input.bypassedChecks.join(", ")}`
      : "Bypassed checks: none"
  ]
    .filter(Boolean)
    .join("\n");
}
