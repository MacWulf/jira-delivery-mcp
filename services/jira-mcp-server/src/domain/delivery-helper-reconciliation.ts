import type {
  IssueStateReconciliationApplyResult,
  IssueStateReconciliationPlan
} from "./state-reconciliation.js";

export type DeliveryHelperOperation = "start" | "sync" | "close";

export type DeliveryHelperResultType =
  | "normal_success"
  | "normal_block"
  | "reconciliation_applied"
  | "reconciliation_plan_required"
  | "workflow_admin_required"
  | "manual_step_required";

export type DeliveryHelperFallbackResult = {
  issueKey: string;
  operation: DeliveryHelperOperation;
  resultType: DeliveryHelperResultType;
  normalFailure: string;
  reconciliationAttempted: boolean;
  reconciliationPlan?: IssueStateReconciliationPlan;
  reconciliationResult?: IssueStateReconciliationApplyResult;
  manualStepRequired: boolean;
  confirmationRequired: boolean;
  message: string;
};
