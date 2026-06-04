import { parseAcceptanceCriteriaFromText } from "../domain/acceptance-criteria.js";
import { parseIssueStructuredMetadataFromDescription } from "../domain/issue-structured-metadata.js";
import { inferWorkflowSemantic } from "./workflow-semantics.js";
import {
  buildIssueDependencySnapshot,
  type IssueDependencySnapshot
} from "./dependency-policy.js";
import {
  findTransitionByName,
  type JiraIssueForSelection,
  type JiraTransition
} from "./assistant-policy.js";

export type IssueReadinessStage =
  | "select"
  | "start"
  | "handoff"
  | "close";

export type IssueReadinessKind =
  | "story"
  | "task"
  | "bug"
  | "validation"
  | "epic"
  | "unknown";

export type IssueReadinessCheck = {
  code: string;
  label: string;
  passed: boolean;
  severity: "error" | "warning";
  detail?: string;
};

export type IssueReadinessEvaluation = {
  issueKey?: string;
  summary?: string;
  stage: IssueReadinessStage;
  kind: IssueReadinessKind;
  passed: boolean;
  descriptionText: string;
  acceptanceCriteriaCount: number;
  acceptanceCriteriaSource: "section" | "checklist" | "none";
  dependencySnapshot: IssueDependencySnapshot;
  closeTransitionAvailable?: boolean;
  availableTransitionNames?: string[];
  checks: IssueReadinessCheck[];
  failedChecks: IssueReadinessCheck[];
  warningChecks: IssueReadinessCheck[];
};

export function evaluateIssueReadiness(
  issue: JiraIssueForSelection,
  stage: IssueReadinessStage,
  options?: {
    availableTransitions?: JiraTransition[];
  }
): IssueReadinessEvaluation {
  const issueTypeName = issue.fields?.issuetype?.name;
  const kind = classifyIssueReadinessKind(issue);
  const descriptionData = parseIssueStructuredMetadataFromDescription(
    issue.fields?.description
  );
  const acceptanceCriteria = parseAcceptanceCriteriaFromText(
    descriptionData.descriptionText
  );
  const dependencySnapshot = buildIssueDependencySnapshot(issue);
  const semantic = inferWorkflowSemantic({
    statusName: issue.fields?.status?.name,
    statusCategoryKey: issue.fields?.status?.statusCategory?.key
  });
  const checks: IssueReadinessCheck[] = [];

  checks.push(
    buildCheck(
      "has-summary",
      "Issue has a summary.",
      Boolean(issue.fields?.summary),
      "error"
    )
  );

  checks.push(
    buildCheck(
      "has-context",
      "Issue has implementation context in its description.",
      Boolean(descriptionData.descriptionText.trim()),
      kind === "epic" ? "warning" : "error"
    )
  );

  if (stage !== "close") {
    checks.push(
      buildCheck(
        "no-open-blockers",
        "Issue has no open blocking dependency.",
        !dependencySnapshot.hasOpenBlockingDependencies,
        "error",
        dependencySnapshot.hasOpenBlockingDependencies
          ? `Open blockers: ${dependencySnapshot.openBlockedBy
              .map((item) => item.issueKey)
              .join(", ")}`
          : undefined
      )
    );
    checks.push(
      buildCheck(
        "no-architecture-block",
        "Issue is not blocked by an active architecture decision gap.",
        !descriptionData.architectureMetadata?.architectureBlockReason,
        "error",
        descriptionData.architectureMetadata?.architectureBlockReason
      )
    );
  }

  if (stage === "close") {
    const availableTransitions = options?.availableTransitions ?? [];
    const closeTransition = selectCloseTransition(availableTransitions);

    checks.push(
      buildCheck(
        "close-not-from-backlog",
        "Issue is not being closed directly from backlog-like states.",
        !["todo", "backlog", "unknown"].includes(semantic),
        "error",
        `Current workflow semantic: ${semantic}`
      )
    );
    checks.push(
      buildCheck(
        "close-not-while-blocked",
        "Issue is not in a blocked lifecycle state when closing.",
        semantic !== "blocked",
        "error",
        `Current workflow semantic: ${semantic}`
      )
    );
    checks.push(
      buildCheck(
        "close-no-open-quality-blockers",
        "Issue has no open blocking dependency when moving to done.",
        !dependencySnapshot.hasOpenBlockingDependencies,
        "error",
        dependencySnapshot.hasOpenBlockingDependencies
          ? `Open blockers: ${dependencySnapshot.openBlockedBy
              .map((item) => item.issueKey)
              .join(", ")}`
          : undefined
      )
    );
    checks.push(
      buildCheck(
        "close-transition-available",
        "Issue has a real Done or Accepted workflow transition from the current status.",
        Boolean(closeTransition),
        "error",
        availableTransitions.length
          ? `Available transitions: ${availableTransitions
              .map((transition) => transition.name)
              .join(", ")}`
          : "Available transitions could not be loaded."
      )
    );
    const openValidationItems = findOpenRelatedValidationItems(issue);
    checks.push(
      buildCheck(
        "close-no-open-validation-items",
        "Linked validation items are complete before moving to done.",
        openValidationItems.length === 0,
        "error",
        openValidationItems.length
          ? `Open validation items: ${openValidationItems.join(", ")}`
          : undefined
      )
    );
  }

  switch (kind) {
    case "story":
      checks.push(
        buildCheck(
          "story-has-acceptance-criteria",
          "Story has explicit acceptance criteria.",
          acceptanceCriteria.items.length > 0,
          "error"
        )
      );
      checks.push(
        buildCheck(
          "story-has-parent-context",
          "Story is linked to a parent planning item when applicable.",
          Boolean(issue.fields?.parent?.key),
          "warning"
        )
      );
      break;
    case "task":
      checks.push(
        buildCheck(
          "task-has-parent-or-context",
          "Task has a parent or enough standalone context.",
          Boolean(issue.fields?.parent?.key) ||
            Boolean(descriptionData.descriptionText.trim()),
          "error"
        )
      );
      break;
    case "bug":
      checks.push(
        buildCheck(
          "bug-has-repro-context",
          "Bug has reproducible context in the description.",
          descriptionData.descriptionText.trim().length >= 20,
          "error"
        )
      );
      if (stage === "close") {
        checks.push(
          buildCheck(
            "bug-has-structured-evidence",
            "Bug has structured evidence blocks before closure.",
            hasStructuredBugEvidence(descriptionData.descriptionText),
            "error"
          )
        );
      }
      break;
    case "validation":
      checks.push(
        buildCheck(
          "validation-has-acceptance-criteria",
          "Validation work item carries the acceptance criteria it verifies.",
          acceptanceCriteria.items.length > 0,
          "error"
        )
      );
      checks.push(
        buildCheck(
          "validation-has-parent-link",
          "Validation work item is tied to a parent work item.",
          Boolean(issue.fields?.parent?.key) ||
            dependencySnapshot.blocks.length > 0 ||
            dependencySnapshot.related.length > 0,
          "error"
        )
      );
      break;
    case "epic":
      checks.push(
        buildCheck(
          "epic-not-for-delivery-loop",
          "Epics should normally stay out of the day-to-day execution loop.",
          stage === "close",
          "warning"
        )
      );
      break;
    case "unknown":
      checks.push(
        buildCheck(
          "known-issue-type",
          `Issue type '${issueTypeName ?? "Unknown"}' maps to a known readiness policy.`,
          false,
          "warning"
        )
      );
      break;
    default:
      break;
  }

  const failedChecks = checks.filter(
    (check) => check.severity === "error" && !check.passed
  );
  const warningChecks = checks.filter(
    (check) => check.severity === "warning" && !check.passed
  );

  return {
    ...(issue.key ? { issueKey: issue.key } : {}),
    ...(issue.fields?.summary ? { summary: issue.fields.summary } : {}),
    stage,
    kind,
    passed: failedChecks.length === 0,
    descriptionText: descriptionData.descriptionText,
    acceptanceCriteriaCount: acceptanceCriteria.items.length,
    acceptanceCriteriaSource: acceptanceCriteria.source,
    dependencySnapshot,
    ...(stage === "close"
      ? {
          closeTransitionAvailable: Boolean(
            selectCloseTransition(options?.availableTransitions ?? [])
          ),
          ...(options?.availableTransitions
            ? {
                availableTransitionNames: options.availableTransitions.map(
                  (transition) => transition.name
                )
              }
            : {})
        }
      : {}),
    checks,
    failedChecks,
    warningChecks
  };
}

export function summarizeReadinessFailures(
  evaluation: IssueReadinessEvaluation
): string {
  if (evaluation.passed) {
    return `${evaluation.issueKey ?? "Issue"} is ready for ${evaluation.stage}.`;
  }

  const failures = evaluation.failedChecks.map((check) =>
    check.detail ? `${check.label} (${check.detail})` : check.label
  );

  return `${evaluation.issueKey ?? "Issue"} is not ready for ${
    evaluation.stage
  }: ${failures.join("; ")}`;
}

export function classifyIssueReadinessKind(
  issue: JiraIssueForSelection
): IssueReadinessKind {
  const typeName = normalize(issue.fields?.issuetype?.name);
  const labels = new Set((issue.fields?.labels ?? []).map(normalize));

  if (
    labels.has("quality-validation") ||
    labels.has("acceptance-validation") ||
    labels.has("quality-test") ||
    typeName.includes("test") ||
    typeName.includes("validation")
  ) {
    return "validation";
  }

  if (typeName === "bug" || labels.has("bug")) {
    if (
      typeName === "story" ||
      typeName === "feature" ||
      typeName === "request"
    ) {
      return "story";
    }

    return "bug";
  }

  if (
    typeName === "story" ||
    typeName === "feature" ||
    typeName === "request"
  ) {
    return "story";
  }

  if (typeName === "task" || typeName === "subtask" || typeName === "sub-task") {
    return "task";
  }

  if (typeName === "epic") {
    return "epic";
  }

  return "unknown";
}

function buildCheck(
  code: string,
  label: string,
  passed: boolean,
  severity: "error" | "warning",
  detail?: string
): IssueReadinessCheck {
  return {
    code,
    label,
    passed,
    severity,
    ...(detail ? { detail } : {})
  };
}

function normalize(value?: string): string {
  return (value ?? "").trim().toLowerCase();
}

function findOpenRelatedValidationItems(issue: JiraIssueForSelection): string[] {
  const openItems: string[] = [];

  for (const link of issue.fields?.issuelinks ?? []) {
    if (normalize(link.type?.name) !== "relates") {
      continue;
    }

    const relatedIssue = link.outwardIssue ?? link.inwardIssue;
    const summary = normalize(relatedIssue?.fields?.summary);

    if (!relatedIssue?.key || !summary.startsWith("[validation]")) {
      continue;
    }

    const semantic = inferWorkflowSemantic({
      statusName: relatedIssue.fields?.status?.name,
      statusCategoryKey: relatedIssue.fields?.status?.statusCategory?.key
    });

    if (semantic !== "done" && semantic !== "canceled") {
      openItems.push(relatedIssue.key);
    }
  }

  return openItems;
}

function hasStructuredBugEvidence(descriptionText: string): boolean {
  const normalized = normalize(descriptionText);

  return (
    normalized.includes("steps to reproduce") &&
    normalized.includes("actual behavior") &&
    normalized.includes("expected behavior")
  );
}

function selectCloseTransition(
  transitions: JiraTransition[]
): JiraTransition | undefined {
  for (const name of ["Accepted", "Done", "Closed", "Resolved"]) {
    const match = findTransitionByName(transitions, name);

    if (match) {
      return match;
    }
  }

  return transitions.find((transition) => {
    const semantic = inferWorkflowSemantic({
      statusName: transition.to?.name,
      statusCategoryKey: transition.to?.statusCategory?.key
    });

    return semantic === "done";
  });
}
