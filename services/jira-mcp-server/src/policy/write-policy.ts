import type { AppConfig } from "../config.js";

export type WriteOperation =
  | "create_project"
  | "update_workflow"
  | "create_issue"
  | "update_issue"
  | "transition_issue"
  | "link_issues"
  | "delete_issue_link"
  | "add_comment"
  | "add_worklog"
  | "create_doc_page";

export function ensureWriteAllowed(
  config: AppConfig,
  operation: WriteOperation,
  confirm?: boolean
): { mode: "dry-run" | "live" } {
  if (config.executionMode === "dry-run") {
    return { mode: "dry-run" };
  }

  if (config.requireConfirmation && confirm !== true) {
    throw new Error(
      `Live write blocked for ${operation}. Set confirm=true to execute this write in Jira.`
    );
  }

  return { mode: "live" };
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
