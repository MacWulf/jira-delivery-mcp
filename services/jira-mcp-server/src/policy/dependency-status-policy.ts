import type { JiraIssueForSelection } from "./assistant-policy.js";
import { buildIssueDependencySnapshot } from "./dependency-policy.js";
import { inferWorkflowSemantic } from "./workflow-semantics.js";

export type DependencyStatusSignal = {
  code:
    | "blocked_waiting"
    | "blocked_active_work"
    | "upstream_gate"
    | "aligned";
  severity: "info" | "warning";
  message: string;
  recommendedStatusSemantic?: "todo" | "in_progress";
};

export function buildDependencyStatusSignals(
  issue: JiraIssueForSelection
): DependencyStatusSignal[] {
  const snapshot = buildIssueDependencySnapshot(issue);
  const semantic = inferWorkflowSemantic({
    statusName: issue.fields?.status?.name,
    statusCategoryKey: issue.fields?.status?.statusCategory?.key
  });
  const signals: DependencyStatusSignal[] = [];

  if (snapshot.hasOpenBlockingDependencies) {
    if (semantic === "in_progress" || semantic === "review" || semantic === "qa") {
      signals.push({
        code: "blocked_active_work",
        severity: "warning",
        message:
          "Issue has open blockers but is still in active work. Prefer re-queueing or an explicit blocked semantic before continuing.",
        recommendedStatusSemantic: "todo"
      });
    } else if (semantic !== "done" && semantic !== "canceled") {
      signals.push({
        code: "blocked_waiting",
        severity: "info",
        message:
          semantic === "blocked"
            ? "Issue is explicitly marked blocked and still has open blockers."
            : "Issue has open blockers and should stay out of the active execution queue until those dependencies are cleared.",
        recommendedStatusSemantic: "todo"
      });
    }
  }

  if (
    snapshot.blocksOpenWork &&
    !snapshot.hasOpenBlockingDependencies &&
    semantic !== "done" &&
    semantic !== "canceled" &&
    (semantic === "todo" || semantic === "backlog" || semantic === "ready")
  ) {
    signals.push({
      code: "upstream_gate",
      severity: "info",
      message:
        "Issue is an upstream gate for open dependent work. Prioritizing it may unlock additional executable items.",
      recommendedStatusSemantic: "in_progress"
    });
  }

  if (signals.length === 0) {
    signals.push({
      code: "aligned",
      severity: "info",
      message: "Issue status appears aligned with its current dependency posture."
    });
  }

  return signals;
}
