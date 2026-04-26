import type {
  IssueStateReconciliationPlan,
  ReconciliationPathStep,
  ReconciliationReadinessSignal,
  ReconciliationSemantic
} from "../domain/state-reconciliation.js";
import { isReconciliationSemantic } from "../domain/state-reconciliation.js";
import type {
  IssueReadinessEvaluation,
  IssueReadinessStage
} from "./readiness-policy.js";
import { inferWorkflowSemantic, type WorkflowSemantic } from "./workflow-semantics.js";
import type { WorkflowDiscoverySnapshot } from "../services/workflow-discovery-service.js";
import type { JiraIssueForSelection, JiraTransition } from "./assistant-policy.js";

type ReconciliationAssessmentInput = {
  issue: JiraIssueForSelection;
  transitions: JiraTransition[];
  workflowSnapshot?: WorkflowDiscoverySnapshot;
  readiness: {
    select: IssueReadinessEvaluation;
    start: IssueReadinessEvaluation;
    handoff: IssueReadinessEvaluation;
    close: IssueReadinessEvaluation;
  };
  intentStage?: IssueReadinessStage;
  targetSemanticHint?: ReconciliationSemantic;
  reason?: string;
};

type StagePlan = {
  stage: IssueReadinessStage;
  targetSemantic?: ReconciliationSemantic;
  reason: string;
  targetSource:
    | "already-aligned"
    | "workflow-inference"
    | "caller-hint"
    | "ambiguous";
  notes: string[];
};

const HUMAN_GATE_LABELS = new Set([
  "human-gate",
  "human-testing",
  "user-testing",
  "needs-user-testing",
  "manual-validation"
]);

const HARD_CLOSE_FAILURES = new Set([
  "close-no-open-quality-blockers",
  "close-no-open-validation-items",
  "close-transition-available"
]);

const HARD_START_FAILURES = new Set(["no-open-blockers", "has-context"]);
const HARD_HANDOFF_FAILURES = new Set(["has-summary", "has-context", "no-open-blockers"]);

const BYPASSABLE_CLOSE_FAILURES = new Set([
  "close-not-from-backlog"
]);

export function buildIssueStateReconciliationPlan(
  input: ReconciliationAssessmentInput
): IssueStateReconciliationPlan {
  const issueKey = input.issue.key ?? "unknown";
  const currentStatusName = input.issue.fields?.status?.name;
  const currentSemantic = inferWorkflowSemantic({
    statusName: currentStatusName,
    statusCategoryKey: input.issue.fields?.status?.statusCategory?.key
  });
  const issueTypeName = input.issue.fields?.issuetype?.name ?? "Unknown";
  const projectKey = input.issue.fields?.project?.key;
  const labels = new Set(
    (input.issue.fields?.labels ?? []).map((label) => label.trim().toLowerCase())
  );
  const commentCount = input.issue.fields?.comment?.total ?? 0;
  const worklogCount = input.issue.fields?.worklog?.total ?? 0;
  const hasProgressTrace = commentCount > 0 || worklogCount > 0;
  const workflowHasHumanTesting = Boolean(
    input.workflowSnapshot?.statusesObserved.some(
      (status) => status.semantic === "human_testing"
    )
  );
  const explicitHumanGate =
    Array.from(labels).some((label) => HUMAN_GATE_LABELS.has(label)) ||
    currentSemantic === "human_testing";
  const defaultHumanGate = workflowHasHumanTesting ? "human_testing" : "qa";
  const notes: string[] = [];

  if (workflowHasHumanTesting) {
    notes.push("Workflow discovery found a dedicated human-testing status.");
  } else {
    notes.push("Workflow discovery did not find a dedicated human-testing status; QA remains the default human gate.");
  }

  if (hasProgressTrace) {
    notes.push("Issue has comment/worklog activity that can be used as a progress-trace signal.");
  }

  const stagePlan = resolveStagePlan({
    currentSemantic,
    hasProgressTrace,
    workflowHasHumanTesting,
    explicitHumanGate,
    defaultHumanGate,
    labels,
    readiness: input.readiness,
    transitions: input.transitions,
    ...(input.intentStage ? { intentStage: input.intentStage } : {}),
    ...(input.targetSemanticHint
      ? { targetSemanticHint: input.targetSemanticHint }
      : {}),
    ...(input.reason ? { reason: input.reason } : {})
  });

  const readinessSignals = buildReadinessSignals(input.readiness);

  if (stagePlan.targetSource === "ambiguous" || !stagePlan.targetSemantic) {
    return {
      issueKey,
      ...(input.issue.fields?.summary ? { summary: input.issue.fields.summary } : {}),
      ...(projectKey ? { projectKey } : {}),
      status: "blocked",
      ...(currentStatusName ? { currentStatusName } : {}),
      currentSemantic,
      inferredActualSemantic: "unknown",
      targetSource: "ambiguous",
      reason: stagePlan.reason,
      pathKind: "none",
      path: [],
      riskLevel: "high",
      confirmationRequired: false,
      manualStepRequired: true,
      blockCategory: "ambiguous_actual_state",
      bypassedChecks: [],
      readinessSignals,
      notes: [
        ...notes,
        `Issue type '${issueTypeName}' did not yield a safe target state from current evidence.`,
        ...stagePlan.notes
      ]
    };
  }

  const inferredActualSemantic = stagePlan.targetSemantic;
  const targetSemantic = stagePlan.targetSemantic;

  if (currentSemantic === targetSemantic) {
    return {
      issueKey,
      ...(input.issue.fields?.summary ? { summary: input.issue.fields.summary } : {}),
      ...(projectKey ? { projectKey } : {}),
      status: "already_aligned",
      ...(currentStatusName ? { currentStatusName } : {}),
      currentSemantic,
      inferredActualSemantic,
      targetSemantic,
      targetSource: "already-aligned",
      reason:
        input.reason?.trim() ||
        `Issue is already aligned with its inferred ${targetSemantic} state.`,
      pathKind: "none",
      path: [],
      riskLevel: "low",
      confirmationRequired: false,
      manualStepRequired: false,
      bypassedChecks: [],
      readinessSignals,
      notes: [...notes, ...stagePlan.notes]
    };
  }

  if (
    explicitHumanGate &&
    isPastHumanGate(targetSemantic, defaultHumanGate)
  ) {
    return {
      issueKey,
      ...(input.issue.fields?.summary ? { summary: input.issue.fields.summary } : {}),
      ...(projectKey ? { projectKey } : {}),
      status: "blocked",
      ...(currentStatusName ? { currentStatusName } : {}),
      currentSemantic,
      inferredActualSemantic,
      targetSemantic,
      targetSource: stagePlan.targetSource,
      reason:
        input.reason?.trim() ||
        `Issue appears to require a human validation gate before it can move beyond ${defaultHumanGate}.`,
      pathKind: "none",
      path: [],
      riskLevel: "high",
      confirmationRequired: false,
      manualStepRequired: true,
      blockCategory: "human_gate",
      bypassedChecks: [],
      readinessSignals,
      notes: [
        ...notes,
        ...stagePlan.notes,
        "A human-gate signal is present, so reconciliation stops before bypassing that gate."
      ]
    };
  }

  const path = resolveReconciliationPath({
    currentSemantic,
    targetSemantic,
    issueTypeName,
    transitions: input.transitions,
    ...(input.workflowSnapshot ? { workflowSnapshot: input.workflowSnapshot } : {})
  });

  if (path.length === 0) {
    return {
      issueKey,
      ...(input.issue.fields?.summary ? { summary: input.issue.fields.summary } : {}),
      ...(projectKey ? { projectKey } : {}),
      status: "blocked",
      ...(currentStatusName ? { currentStatusName } : {}),
      currentSemantic,
      inferredActualSemantic,
      targetSemantic,
      targetSource: stagePlan.targetSource,
      reason:
        input.reason?.trim() ||
        `No safe Jira workflow path could be resolved from ${currentSemantic} to ${targetSemantic}.`,
      pathKind: "none",
      path: [],
      riskLevel: "high",
      confirmationRequired: false,
      manualStepRequired: true,
      blockCategory: input.workflowSnapshot
        ? "missing_workflow_path"
        : "tenant_or_api_limitation",
      bypassedChecks: [],
      readinessSignals,
      notes: [
        ...notes,
        ...stagePlan.notes,
        input.workflowSnapshot
          ? "Workflow discovery did not produce a usable transition path for the requested alignment."
          : "Workflow discovery data was unavailable, so only current-state transitions could be considered."
      ]
    };
  }

  const readinessForTarget = selectReadinessForTarget(targetSemantic, input.readiness);
  const hardFailureCode = findHardFailureCode(targetSemantic, readinessForTarget);
  const bypassedChecks = findBypassedChecks(targetSemantic, readinessForTarget);

  if (hardFailureCode) {
    return {
      issueKey,
      ...(input.issue.fields?.summary ? { summary: input.issue.fields.summary } : {}),
      ...(projectKey ? { projectKey } : {}),
      status: "blocked",
      ...(currentStatusName ? { currentStatusName } : {}),
      currentSemantic,
      inferredActualSemantic,
      targetSemantic,
      targetSource: stagePlan.targetSource,
      reason:
        input.reason?.trim() ||
        `Target state ${targetSemantic} is still blocked by ${hardFailureCode}.`,
      pathKind: path.length > 1 ? "multi-hop" : "single-hop",
      path,
      riskLevel: "high",
      confirmationRequired: false,
      manualStepRequired: true,
      blockCategory:
        targetSemantic === "done"
          ? "dependency_or_quality_gate"
          : "unsupported_current_state",
      bypassedChecks: [],
      readinessSignals,
      notes: [
        ...notes,
        ...stagePlan.notes,
        `Readiness still fails for ${targetSemantic} because of ${hardFailureCode}.`
      ]
    };
  }

  const riskLevel = classifyReconciliationRisk({
    currentSemantic,
    targetSemantic,
    path,
    targetSource: stagePlan.targetSource,
    readiness: readinessForTarget,
    bypassedChecks,
    explicitHumanGate,
    workflowHasHumanTesting
  });
  const confirmationRequired = riskLevel === "high";

  return {
    issueKey,
    ...(input.issue.fields?.summary ? { summary: input.issue.fields.summary } : {}),
    ...(projectKey ? { projectKey } : {}),
    status: "ready_to_apply",
    ...(currentStatusName ? { currentStatusName } : {}),
    currentSemantic,
    inferredActualSemantic,
    targetSemantic,
    targetSource: stagePlan.targetSource,
    reason: input.reason?.trim() || stagePlan.reason,
    pathKind: path.length > 1 ? "multi-hop" : "single-hop",
    path,
    riskLevel,
    confirmationRequired,
    manualStepRequired: false,
    bypassedChecks,
    readinessSignals,
    notes: [
      ...notes,
      ...stagePlan.notes,
      confirmationRequired
        ? "This reconciliation is considered risky and requires explicit confirmation."
        : "This reconciliation can execute as a normal operational write."
    ]
  };
}

function resolveStagePlan(input: {
  currentSemantic: WorkflowSemantic;
  hasProgressTrace: boolean;
  workflowHasHumanTesting: boolean;
  explicitHumanGate: boolean;
  defaultHumanGate: ReconciliationSemantic;
  labels: Set<string>;
  readiness: ReconciliationAssessmentInput["readiness"];
  transitions: JiraTransition[];
  intentStage?: IssueReadinessStage;
  targetSemanticHint?: ReconciliationSemantic;
  reason?: string;
}): StagePlan {
  if (input.targetSemanticHint) {
    return {
      stage: "close",
      targetSemantic: input.targetSemanticHint,
      reason:
        input.reason?.trim() ||
        `Caller requested alignment to ${input.targetSemanticHint}.`,
      targetSource: "caller-hint",
      notes: [`Target semantic was provided explicitly as '${input.targetSemanticHint}'.`]
    };
  }

  if (input.currentSemantic === "done" || input.currentSemantic === "canceled") {
    return {
      stage: "close",
      targetSemantic: input.currentSemantic,
      reason: `Issue is already in a terminal ${input.currentSemantic} state.`,
      targetSource: "already-aligned",
      notes: []
    };
  }

  const transitionSemantics = input.transitions
    .map((transition) =>
      inferWorkflowSemantic({
        statusName: transition.to?.name,
        statusCategoryKey: transition.to?.statusCategory?.key
      })
    )
    .filter((semantic) => semantic !== "unknown");

  const closeOnlyBypassable =
    input.readiness.close.failedChecks.length > 0 &&
    input.readiness.close.failedChecks.every((check) =>
      BYPASSABLE_CLOSE_FAILURES.has(check.code)
    );

  const closeTerminalCandidate =
    (input.readiness.close.passed || closeOnlyBypassable) &&
    transitionSemantics.some(
      (semantic) => semantic === "done" || semantic === "canceled"
    ) &&
    input.hasProgressTrace;

  if (input.readiness.start.failedChecks.some((check) => check.code === "no-open-blockers")) {
    return {
      stage: "start",
      targetSemantic: "blocked",
      reason: "The issue has an open blocking dependency and should align to a blocked state.",
      targetSource: "workflow-inference",
      notes: []
    };
  }

  if (
    input.currentSemantic === "blocked" &&
    input.readiness.start.passed
  ) {
    if (transitionSemantics.includes("in_progress")) {
      return {
        stage: "start",
        targetSemantic: "in_progress",
        reason: "The issue is no longer blocked and can return to active work.",
        targetSource: "workflow-inference",
        notes: []
      };
    }

    if (transitionSemantics.includes("ready")) {
      return {
        stage: "select",
        targetSemantic: "ready",
        reason: "The issue is no longer blocked and can return to a ready queue.",
        targetSource: "workflow-inference",
        notes: []
      };
    }
  }

  if (
    (input.currentSemantic === "todo" ||
      input.currentSemantic === "backlog" ||
      input.currentSemantic === "ready") &&
    input.intentStage === "close" &&
    closeTerminalCandidate
  ) {
    const targetSemantic = transitionSemantics.includes("done")
      ? "done"
      : "canceled";

    return {
      stage: "close",
      targetSemantic,
      reason:
        "The issue has a viable terminal workflow path and the remaining close failure is status-drift rather than an open quality gate.",
      targetSource: "workflow-inference",
      notes: [
        "Close helper requested reconciliation and the issue satisfies terminal-readiness checks except for drift-compatible conditions."
      ]
    };
  }

  if (
    (input.currentSemantic === "todo" ||
      input.currentSemantic === "backlog" ||
      input.currentSemantic === "ready") &&
    input.hasProgressTrace
  ) {
    if (input.readiness.start.passed && transitionSemantics.includes("in_progress")) {
      return {
        stage: "start",
        targetSemantic: "in_progress",
        reason:
          "The issue is still backlog-like, but progress traces indicate active delivery work.",
        targetSource: "workflow-inference",
        notes: []
      };
    }

    if (input.readiness.select.passed && transitionSemantics.includes("ready")) {
      return {
        stage: "select",
        targetSemantic: "ready",
        reason:
          "The issue has progress traces and should at least leave raw backlog into a ready queue.",
        targetSource: "workflow-inference",
        notes: []
      };
    }
  }

  if (
    (input.intentStage === "start" || input.intentStage === "select") &&
    (input.currentSemantic === "todo" || input.currentSemantic === "backlog") &&
    input.readiness.select.passed &&
    transitionSemantics.includes("ready")
  ) {
    return {
      stage: "select",
      targetSemantic: "ready",
      reason:
        "The issue cannot safely enter active work yet, but it can still be aligned into a ready/selected queue.",
      targetSource: "workflow-inference",
      notes: []
    };
  }

  if (
    input.intentStage === "start" &&
    input.currentSemantic === "ready" &&
    input.readiness.start.passed &&
    transitionSemantics.includes("in_progress")
  ) {
    return {
      stage: "start",
      targetSemantic: "in_progress",
      reason:
        "The issue is already ready/selected and can safely align into active work.",
      targetSource: "workflow-inference",
      notes: []
    };
  }

  if (
    input.currentSemantic === "review" &&
    input.readiness.handoff.passed
  ) {
    if (transitionSemantics.includes("qa")) {
      return {
        stage: "handoff",
        targetSemantic: "qa",
        reason: "Review is complete enough to continue into assistant-owned QA.",
        targetSource: "workflow-inference",
        notes: []
      };
    }

    if (transitionSemantics.includes("human_testing")) {
      return {
        stage: "handoff",
        targetSemantic: "human_testing",
        reason: "Review is complete enough to continue into human testing.",
        targetSource: "workflow-inference",
        notes: []
      };
    }
  }

  if (
    input.currentSemantic === "qa" &&
    input.workflowHasHumanTesting &&
    !input.explicitHumanGate &&
    transitionSemantics.includes("human_testing")
  ) {
    return {
      stage: "handoff",
      targetSemantic: "human_testing",
      reason: "Technical QA appears complete and the next workflow gate is human testing.",
      targetSource: "workflow-inference",
      notes: []
    };
  }

  if (closeTerminalCandidate) {
    const targetSemantic = transitionSemantics.includes("done")
      ? "done"
      : "canceled";

    return {
      stage: "close",
      targetSemantic,
      reason:
        "The issue has a viable terminal workflow path and the remaining close failure is status-drift rather than an open quality gate.",
      targetSource: "workflow-inference",
      notes: [
        "Terminal reconciliation was inferred from progress traces plus close-readiness checks that only failed on drift-compatible conditions."
      ]
    };
  }

  return {
    stage: "start",
    reason:
      "Current Jira evidence does not safely imply a different workflow state without an explicit target hint.",
    targetSource: "ambiguous",
    notes: [
      "Use targetSemanticHint when the real delivery state is known from external context such as repo state or stakeholder confirmation."
    ]
  };
}

function buildReadinessSignals(
  readiness: ReconciliationAssessmentInput["readiness"]
): ReconciliationReadinessSignal[] {
  return (["select", "start", "handoff", "close"] as const).map((stage) => ({
    stage,
    passed: readiness[stage].passed,
    failedCheckCodes: readiness[stage].failedChecks.map((check) => check.code)
  }));
}

function resolveReconciliationPath(input: {
  currentSemantic: WorkflowSemantic;
  targetSemantic: ReconciliationSemantic;
  issueTypeName: string;
  transitions: JiraTransition[];
  workflowSnapshot?: WorkflowDiscoverySnapshot;
}): ReconciliationPathStep[] {
  const direct = selectDirectTransition(
    input.currentSemantic,
    input.targetSemantic,
    input.transitions
  );

  if (direct) {
    return [direct];
  }

  if (!input.workflowSnapshot) {
    return [];
  }

  const graph = buildSemanticGraph(input.workflowSnapshot, input.issueTypeName);
  const visited = new Set<string>([input.currentSemantic]);
  const queue: Array<{
    semantic: WorkflowSemantic | "human_testing";
    path: ReconciliationPathStep[];
  }> = [];

  for (const transition of input.transitions) {
    const toSemantic = inferWorkflowSemantic({
      statusName: transition.to?.name,
      statusCategoryKey: transition.to?.statusCategory?.key
    });

    if (!isReconciliationSemantic(toSemantic) || toSemantic === input.currentSemantic) {
      continue;
    }

    queue.push({
      semantic: toSemantic,
      path: [
        {
          index: 1,
          fromSemantic: input.currentSemantic,
          toSemantic,
          transitionName: transition.name,
          transitionId: transition.id,
          source: "current-issue"
        }
      ]
    });
    visited.add(toSemantic);
  }

  while (queue.length > 0) {
    const node = queue.shift();

    if (!node) {
      continue;
    }

    if (node.semantic === input.targetSemantic) {
      return node.path;
    }

    for (const edge of graph.get(node.semantic) ?? []) {
      if (visited.has(edge.toSemantic)) {
        continue;
      }

      visited.add(edge.toSemantic);
      queue.push({
        semantic: edge.toSemantic,
        path: [
          ...node.path,
          {
            index: node.path.length + 1,
            fromSemantic: node.semantic,
            toSemantic: edge.toSemantic,
            transitionName: edge.transitionName,
            source: "workflow-snapshot"
          }
        ]
      });
    }
  }

  return [];
}

function buildSemanticGraph(
  workflowSnapshot: WorkflowDiscoverySnapshot,
  issueTypeName: string
): Map<WorkflowSemantic | "human_testing", Array<{ toSemantic: ReconciliationSemantic; transitionName: string }>> {
  const graph = new Map<
    WorkflowSemantic | "human_testing",
    Array<{ toSemantic: ReconciliationSemantic; transitionName: string }>
  >();

  const preferredSamples = workflowSnapshot.transitionsObserved.filter(
    (sample) => normalize(sample.issueTypeName) === normalize(issueTypeName)
  );
  const samples =
    preferredSamples.length > 0
      ? preferredSamples
      : workflowSnapshot.transitionsObserved;

  for (const sample of samples) {
    const fromSemantic = sample.currentSemantic;

    for (const transition of sample.transitions) {
      const toSemantic = transition.toSemantic;

      if (!isReconciliationSemantic(toSemantic) || toSemantic === fromSemantic) {
        continue;
      }

      const edges = graph.get(fromSemantic) ?? [];

      if (
        !edges.some(
          (edge) =>
            edge.toSemantic === toSemantic &&
            normalize(edge.transitionName) === normalize(transition.transitionName)
        )
      ) {
        edges.push({
          toSemantic,
          transitionName: transition.transitionName
        });
      }

      graph.set(fromSemantic, edges);
    }
  }

  return graph;
}

function selectDirectTransition(
  currentSemantic: WorkflowSemantic,
  targetSemantic: ReconciliationSemantic,
  transitions: JiraTransition[]
): ReconciliationPathStep | undefined {
  const candidates = transitions
    .map((transition) => ({
      transition,
      toSemantic: inferWorkflowSemantic({
        statusName: transition.to?.name,
        statusCategoryKey: transition.to?.statusCategory?.key
      })
    }))
    .filter(({ toSemantic }) => toSemantic === targetSemantic);

  const selected = candidates.sort((left, right) =>
    normalize(left.transition.name).localeCompare(normalize(right.transition.name))
  )[0];

  if (!selected) {
    return undefined;
  }

  return {
    index: 1,
    fromSemantic: currentSemantic,
    toSemantic: targetSemantic,
    transitionName: selected.transition.name,
    transitionId: selected.transition.id,
    source: "current-issue"
  };
}

function selectReadinessForTarget(
  targetSemantic: ReconciliationSemantic,
  readiness: ReconciliationAssessmentInput["readiness"]
): IssueReadinessEvaluation {
  switch (targetSemantic) {
    case "ready":
    case "backlog":
    case "todo":
      return readiness.select;
    case "in_progress":
    case "blocked":
      return readiness.start;
    case "review":
    case "qa":
    case "human_testing":
      return readiness.handoff;
    case "done":
    case "canceled":
    default:
      return readiness.close;
  }
}

function findHardFailureCode(
  targetSemantic: ReconciliationSemantic,
  readiness: IssueReadinessEvaluation
): string | undefined {
  for (const check of readiness.failedChecks) {
    if (targetSemantic === "done" || targetSemantic === "canceled") {
      if (HARD_CLOSE_FAILURES.has(check.code)) {
        return check.code;
      }
      continue;
    }

    if (
      (targetSemantic === "in_progress" || targetSemantic === "blocked") &&
      HARD_START_FAILURES.has(check.code)
    ) {
      return check.code;
    }

    if (
      (targetSemantic === "review" ||
        targetSemantic === "qa" ||
        targetSemantic === "human_testing") &&
      HARD_HANDOFF_FAILURES.has(check.code)
    ) {
      return check.code;
    }
  }

  return undefined;
}

function findBypassedChecks(
  targetSemantic: ReconciliationSemantic,
  readiness: IssueReadinessEvaluation
): string[] {
  if (targetSemantic !== "done" && targetSemantic !== "canceled") {
    return [];
  }

  return readiness.failedChecks
    .filter((check) => BYPASSABLE_CLOSE_FAILURES.has(check.code))
    .map((check) => check.code);
}

function classifyReconciliationRisk(input: {
  currentSemantic: WorkflowSemantic;
  targetSemantic: ReconciliationSemantic;
  path: ReconciliationPathStep[];
  targetSource: IssueStateReconciliationPlan["targetSource"];
  readiness: IssueReadinessEvaluation;
  bypassedChecks: string[];
  explicitHumanGate: boolean;
  workflowHasHumanTesting: boolean;
}): "low" | "medium" | "high" {
  if (input.targetSemantic === "done" || input.targetSemantic === "canceled") {
    return "high";
  }

  if (
    input.currentSemantic === "human_testing" ||
    (input.currentSemantic === "qa" && !input.workflowHasHumanTesting)
  ) {
    return "high";
  }

  if (input.explicitHumanGate && isPastHumanGate(input.targetSemantic, "qa")) {
    return "high";
  }

  if (input.bypassedChecks.length > 0) {
    return "high";
  }

  if (
    input.targetSource === "caller-hint" &&
    input.readiness.failedChecks.length > 0
  ) {
    return "high";
  }

  if (input.targetSource === "caller-hint" || input.path.length > 1) {
    return "medium";
  }

  return "low";
}

function isPastHumanGate(
  targetSemantic: ReconciliationSemantic,
  defaultHumanGate: ReconciliationSemantic
): boolean {
  if (defaultHumanGate === "human_testing") {
    return targetSemantic === "done" || targetSemantic === "canceled";
  }

  return targetSemantic === "done" || targetSemantic === "canceled";
}

function normalize(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase();
}
