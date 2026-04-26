export type WorkflowSemantic =
  | "backlog"
  | "todo"
  | "ready"
  | "in_progress"
  | "review"
  | "qa"
  | "human_testing"
  | "blocked"
  | "done"
  | "canceled"
  | "unknown";

export function inferWorkflowSemantic(input: {
  statusName?: string | undefined;
  statusCategoryKey?: string | undefined;
}): WorkflowSemantic {
  const name = normalize(input.statusName);
  const category = normalize(input.statusCategoryKey);

  if (containsAny(name, ["cancel", "cancelled", "canceled", "wont do", "won't do"])) {
    return "canceled";
  }

  if (
    containsAny(name, [
      "user testing",
      "uat",
      "user acceptance",
      "acceptance testing",
      "manual validation"
    ])
  ) {
    return "human_testing";
  }

  if (category === "done") {
    return "done";
  }

  if (containsAny(name, ["blocked", "on hold", "waiting", "stalled"])) {
    return "blocked";
  }

  if (containsAny(name, ["code review", "in review", "review"])) {
    return "review";
  }

  if (containsAny(name, ["qa", "verification", "verified", "testing", "test"])) {
    return "qa";
  }

  if (containsAny(name, ["in progress", "start work", "start progress", "doing", "development", "implementing"])) {
    return "in_progress";
  }

  if (containsAny(name, ["ready", "selected", "triage", "refinement"])) {
    return "ready";
  }

  if (containsAny(name, ["backlog"])) {
    return "backlog";
  }

  if (category === "new") {
    return "todo";
  }

  if (category === "indeterminate") {
    return "unknown";
  }

  return "unknown";
}

function containsAny(value: string, patterns: string[]): boolean {
  return patterns.some((pattern) => value.includes(pattern));
}

function normalize(value?: string): string {
  return (value ?? "").trim().toLowerCase();
}
