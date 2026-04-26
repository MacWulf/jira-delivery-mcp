import type { AppConfig } from "../config.js";

export const WRITE_OPERATIONS = [
  "create_project",
  "update_workflow",
  "create_issue_type",
  "create_custom_field",
  "reconcile_issue_state",
  "create_issue",
  "update_issue",
  "transition_issue",
  "link_issues",
  "delete_issue_link",
  "add_comment",
  "add_worklog",
  "create_doc_page",
  "update_doc_page",
  "ensure_project_doc_page"
] as const;

export type WriteOperation =
  (typeof WRITE_OPERATIONS)[number];

export type WriteRiskTier = "operational" | "admin";

export type WritePolicyEvaluation = {
  operation: WriteOperation;
  riskTier: WriteRiskTier;
  executionMode: "dry-run" | "live";
  toolSupport: "tool-supported";
  manualOnly: false;
  confirmationRequired: boolean;
  confirmationSatisfied: boolean;
  liveWriteAllowed: boolean;
  mode: "dry-run" | "live";
  reason: string;
};

const ADMIN_RISK_OPERATIONS = new Set<WriteOperation>([
  "create_project",
  "update_workflow",
  "create_issue_type",
  "create_custom_field",
  "delete_issue_link"
]);

export function ensureWriteAllowed(
  config: AppConfig,
  operation: WriteOperation,
  confirm?: boolean
) {
  const evaluation = evaluateWritePolicy(config, operation, confirm);

  if (evaluation.mode === "dry-run") {
    return evaluation;
  }

  if (!evaluation.liveWriteAllowed) {
    throw new Error(evaluation.reason);
  }

  return evaluation;
}

export function evaluateWritePolicy(
  config: AppConfig,
  operation: WriteOperation,
  confirm?: boolean
): WritePolicyEvaluation {
  const riskTier = getWriteRiskTier(operation);

  if (config.executionMode === "dry-run") {
    return {
      operation,
      riskTier,
      executionMode: config.executionMode,
      toolSupport: "tool-supported",
      manualOnly: false,
      confirmationRequired: false,
      confirmationSatisfied: false,
      liveWriteAllowed: false,
      mode: "dry-run",
      reason:
        `Operation ${operation} is supported, but the current runtime is explicitly configured for dry-run preview mode. ` +
        `Set JIRA_EXECUTION_MODE=live to execute this write in Atlassian.`
    };
  }

  const confirmationRequired =
    riskTier === "admin" && config.requireConfirmation;
  const confirmationSatisfied = !confirmationRequired || confirm === true;

  if (!confirmationSatisfied) {
    return {
      operation,
      riskTier,
      executionMode: config.executionMode,
      toolSupport: "tool-supported",
      manualOnly: false,
      confirmationRequired,
      confirmationSatisfied,
      liveWriteAllowed: false,
      mode: "live",
      reason:
        `Operation ${operation} is supported, but it is currently blocked because it is classified as an admin-risk write. ` +
        `Retry with confirm=true to execute it live in Atlassian.`
    };
  }

  return {
    operation,
    riskTier,
    executionMode: config.executionMode,
    toolSupport: "tool-supported",
    manualOnly: false,
    confirmationRequired,
    confirmationSatisfied,
    liveWriteAllowed: true,
    mode: "live",
    reason:
      riskTier === "admin"
        ? `Operation ${operation} is supported and allowed to execute live because the required admin confirmation was provided.`
        : `Operation ${operation} is supported and allowed to execute live by default.`
  };
}

export function getWriteRiskTier(operation: WriteOperation): WriteRiskTier {
  return ADMIN_RISK_OPERATIONS.has(operation) ? "admin" : "operational";
}

export function buildDryRunResult<T extends Record<string, unknown>>(
  operation: WriteOperation,
  payload: T
) {
  return {
    simulated: true,
    operation,
    payload
  };
}
