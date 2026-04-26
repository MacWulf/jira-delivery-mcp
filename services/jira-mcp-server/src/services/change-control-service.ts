import {
  buildChangeDecisionLogEntry,
  containsAnyChangeKeyword,
  dedupe,
  normalizeChangeText,
  type ChangeApprovalRisk,
  type ChangeClassification,
  type ChangeClassificationConfidence,
  type ChangeDecisionLogEntry,
  type ChangeImpactAction,
  type ChangeOperationType,
  type ChangeReleaseRisk
} from "../domain/change-control.js";
import {
  buildIssueDependencySnapshot,
  extractIssueBlockEdges,
  type IssueBlockEdge,
  type IssueDependencySnapshot
} from "../policy/dependency-policy.js";
import { inferWorkflowSemantic } from "../policy/workflow-semantics.js";
import type { JiraApi, JiraIssueTypeDefinition } from "./jira-api.js";

type ChangeContextIssue = {
  key?: string;
  fields?: {
    summary?: string;
    description?: unknown;
    labels?: string[];
    issuetype?: {
      name?: string;
    };
    parent?: {
      key?: string;
    };
    project?: {
      id?: string;
      key?: string;
      name?: string;
    };
    status?: {
      name?: string;
      statusCategory?: {
        key?: string;
      };
    };
    issuelinks?: Array<{
      id?: string;
      type?: {
        inward?: string;
        outward?: string;
        name?: string;
      };
      inwardIssue?: {
        key?: string;
        fields?: {
          summary?: string;
          status?: {
            name?: string;
            statusCategory?: {
              key?: string;
            };
          };
        };
      };
      outwardIssue?: {
        key?: string;
        fields?: {
          summary?: string;
          status?: {
            name?: string;
            statusCategory?: {
              key?: string;
            };
          };
        };
      };
    }>;
  };
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

export type ChangeImpactAnalysis = {
  issueKey?: string;
  classification: ChangeClassification;
  projectKey?: string;
  changeSummary: string;
  affectedIssues: Array<{
    issueKey: string;
    summary?: string;
    relation:
      | "self"
      | "parent"
      | "blocked_by"
      | "blocks"
      | "related"
      | "explicit";
    statusName?: string;
    semantic: ReturnType<typeof inferWorkflowSemantic>;
    recommendedAction: ChangeImpactAction;
  }>;
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

export type ChangeApprovalGateResult = {
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
  operations: PlannedChangeOperation[];
  approvalGate: ChangeApprovalGateResult;
  decisionLog: ChangeDecisionLogEntry;
  manualStepsRequired: boolean;
  notes: string[];
};

type ChangeExecutionInput = {
  issueKey: string;
  summary: string;
  description?: string;
  classification?: ChangeClassification;
  relatedIssueKeys?: string[];
  createSummary?: string;
  createIssueType?: string;
  dependencyAdjustments?: Array<{
    action: "add" | "remove";
    sourceIssueKey: string;
    targetIssueKey: string;
    typeName?: string;
    existingLinkId?: string;
  }>;
};

export class ChangeControlService {
  constructor(private readonly jiraApi: JiraApi) {}

  async classifyIncomingChange(input: {
    issueKey?: string;
    summary: string;
    description?: string;
  }): Promise<ChangeClassificationResult> {
    const issue = input.issueKey
      ? await this.loadIssue(input.issueKey)
      : undefined;
    const text = normalizeChangeText(
      input.summary,
      input.description,
      issue?.fields?.summary
    );
    const semantic = inferWorkflowSemantic({
      statusName: issue?.fields?.status?.name,
      statusCategoryKey: issue?.fields?.status?.statusCategory?.key
    });
    const scores = {
      change_request: 0,
      bug: 0,
      reopen: 0,
      new_scope: 0
    };
    const reasons: string[] = [];
    const decisionPoints: string[] = [];

    if (
      containsAnyChangeKeyword(text, [
        "bug",
        "defect",
        "error",
        "failure",
        "failing",
        "broken",
        "regression",
        "incorrect",
        "not working"
      ])
    ) {
      scores.bug += 3;
      reasons.push("The request carries explicit bug/regression language.");
    }

    if (
      containsAnyChangeKeyword(text, [
        "reopen",
        "re-open",
        "again",
        "returned",
        "failed validation",
        "retest failed"
      ])
    ) {
      scores.reopen += 3;
      reasons.push("The request explicitly asks to reopen or revisit completed work.");
    }

    if (
      containsAnyChangeKeyword(text, [
        "change",
        "modify",
        "update",
        "adjust",
        "scope",
        "extend",
        "revise",
        "tweak"
      ])
    ) {
      scores.change_request += issue?.key ? 3 : 1;
      reasons.push("The request changes existing intent instead of only describing a defect.");
    }

    if (
      containsAnyChangeKeyword(text, [
        "new scope",
        "new feature",
        "new capability",
        "add support",
        "add a new",
        "introduce",
        "fresh work"
      ])
    ) {
      scores.new_scope += 3;
      reasons.push("The request describes new capability or fresh scope.");
    }

    if (issue?.key && (semantic === "done" || semantic === "review" || semantic === "qa")) {
      scores.reopen += 2;
      reasons.push(
        `The anchor issue is currently '${semantic}', so any returned work may require reopen handling.`
      );
    }

    if (issue?.key && semantic !== "done" && semantic !== "qa" && semantic !== "review") {
      scores.change_request += 1;
      reasons.push("The anchor issue is still active, which favors controlled modification.");
    }

    if (!issue?.key) {
      scores.new_scope += 1;
      reasons.push(
        "No anchor issue was supplied, which slightly favors treating the request as new scope."
      );
    }

    const ordered = Object.entries(scores).sort((left, right) => right[1] - left[1]);
    const top = ordered[0];
    const second = ordered[1];
    const topScore = top?.[1] ?? 0;
    const secondScore = second?.[1] ?? 0;
    let classification: ChangeClassification;
    let confidence: ChangeClassificationConfidence;

    if (!top || topScore === 0 || topScore - secondScore <= 1) {
      classification = "ambiguous";
      confidence = "low";
      decisionPoints.push(
        "Decide whether the work extends the current issue or should be split into separate scope."
      );
      if (scores.bug > 0 && scores.change_request > 0) {
        decisionPoints.push(
          "The text mixes bug language and scope-change language; choose whether to preserve defect history or reshape the current delivery item."
        );
      }
    } else {
      classification = top[0] as ChangeClassification;
      confidence = topScore >= 5 ? "high" : "medium";
    }

    return {
      ...(input.issueKey ? { issueKey: input.issueKey } : {}),
      summary: input.summary,
      ...(input.description ? { description: input.description } : {}),
      classification,
      confidence,
      reasons: dedupe(reasons),
      decisionPoints,
      ...(issue
        ? {
            context: {
              ...(issue.fields?.status?.name
                ? { statusName: issue.fields.status.name }
                : {}),
              semantic,
              ...(issue.fields?.issuetype?.name
                ? { issueTypeName: issue.fields.issuetype.name }
                : {}),
              ...(issue.fields?.parent?.key
                ? { parentIssueKey: issue.fields.parent.key }
                : {}),
              ...(issue.fields?.project?.key
                ? { projectKey: issue.fields.project.key }
                : {})
            },
            dependencySnapshot: buildIssueDependencySnapshot(issue)
          }
        : {})
    };
  }

  async analyzeChangeImpact(input: {
    issueKey?: string;
    summary: string;
    description?: string;
    classification?: ChangeClassification;
    relatedIssueKeys?: string[];
  }): Promise<ChangeImpactAnalysis> {
    if (!input.issueKey && (!input.relatedIssueKeys || input.relatedIssueKeys.length === 0)) {
      throw new Error(
        "analyze_change_impact requires issueKey or relatedIssueKeys so the impact scope is explicit."
      );
    }

    const classification =
      input.classification ??
      (
        await this.classifyIncomingChange({
          ...(input.issueKey ? { issueKey: input.issueKey } : {}),
          summary: input.summary,
          ...(input.description ? { description: input.description } : {})
        })
      ).classification;
    const anchor = input.issueKey ? await this.loadIssue(input.issueKey) : undefined;
    const related = await this.loadRelatedIssues(anchor, input.relatedIssueKeys);
    const dependencyEdges = anchor ? extractIssueBlockEdges(anchor) : [];
    const affectedIssues = [
      ...(anchor
        ? [
            buildImpactIssue(anchor, "self", classification),
            ...(anchor.fields?.parent?.key
              ? [
                  buildImpactIssue(
                    related.byKey.get(anchor.fields.parent.key),
                    "parent",
                    classification
                  )
                ]
              : []),
            ...buildDependencyImpactIssues(anchor, classification),
            ...buildRelatedImpactIssues(anchor, classification)
          ]
        : []),
      ...related.explicitIssues.map((issue) =>
        buildImpactIssue(issue, "explicit", classification)
      )
    ]
      .filter((issue): issue is NonNullable<typeof issue> => Boolean(issue))
      .filter(
        (issue, index, issues) =>
          issues.findIndex((candidate) => candidate.issueKey === issue.issueKey) === index
      );

    const notes: string[] = [];
    const reopenCandidates = affectedIssues.filter(
      (issue) => issue.recommendedAction === "reopen_candidate"
    ).length;
    const relinkCandidates = affectedIssues.filter(
      (issue) => issue.recommendedAction === "relink_review"
    ).length;
    let releaseRisk: ChangeReleaseRisk = "low";

    if (reopenCandidates > 0 || relinkCandidates > 0 || dependencyEdges.length >= 2) {
      releaseRisk = "high";
    } else if (affectedIssues.length >= 3 || dependencyEdges.length === 1) {
      releaseRisk = "medium";
    }

    if (classification === "ambiguous") {
      notes.push(
        "Impact remains partially speculative until a human resolves the ambiguous change classification."
      );
    }

    if (reopenCandidates > 0) {
      notes.push(
        "At least one affected issue is already in review, QA, or done and may need explicit reopen handling."
      );
    }

    if (relinkCandidates > 0) {
      notes.push(
        "Dependency-linked issues are affected, so release order and relink hygiene should be reviewed before applying the change."
      );
    }

    if (releaseRisk === "high") {
      notes.push(
        "This change has a high release-order impact because it touches downstream work or already-reviewed scope."
      );
    }

    return {
      ...(input.issueKey ? { issueKey: input.issueKey } : {}),
      classification,
      ...(anchor?.fields?.project?.key ? { projectKey: anchor.fields.project.key } : {}),
      changeSummary: input.summary,
      affectedIssues,
      dependencyEdges,
      releaseRisk,
      notes
    };
  }

  async planChangeExecution(
    input: ChangeExecutionInput
  ): Promise<ChangeExecutionPlan> {
    const issue = await this.loadIssue(input.issueKey);
    const classificationResult = await this.classifyIncomingChange({
      issueKey: input.issueKey,
      summary: input.summary,
      ...(input.description ? { description: input.description } : {})
    });
    const classification = input.classification ?? classificationResult.classification;
    const impactAnalysis = await this.analyzeChangeImpact({
      issueKey: input.issueKey,
      summary: input.summary,
      ...(input.description ? { description: input.description } : {}),
      classification,
      ...(input.relatedIssueKeys ? { relatedIssueKeys: input.relatedIssueKeys } : {})
    });
    const operations: PlannedChangeOperation[] = [];
    const projectKey = issue.fields?.project?.key;

    if (!projectKey) {
      throw new Error(`Could not resolve project for ${input.issueKey}.`);
    }

    if (classification === "ambiguous") {
      operations.push({
        type: "manual_step",
        reason:
          "The change remains ambiguous, so the plan stops before Jira state mutation is described as executable.",
        highImpact: true,
        payload: {
          issueKey: input.issueKey,
          decisionPoints: classificationResult.decisionPoints
        }
      });
    }

    if (classification === "reopen" || classification === "bug") {
      const reopenOperation = await this.planReopenOperation(input.issueKey);

      if (reopenOperation) {
        operations.push(reopenOperation);
      }
    }

    if (classification === "change_request") {
      operations.push({
        type: "update_issue",
        reason:
          "The anchor issue should record the accepted scope change explicitly instead of silently absorbing it.",
        highImpact: impactAnalysis.releaseRisk !== "low",
        payload: {
          issueKey: input.issueKey,
          fields: {
            summary: issue.fields?.summary,
            descriptionAppend: [
              "## Change request note",
              input.summary,
              input.description ?? ""
            ]
              .filter(Boolean)
              .join("\n")
          }
        }
      });
    }

    if (classification === "new_scope" || classification === "bug") {
      const issueTypeName = await this.resolveCreateIssueType(
        projectKey,
        classification,
        input.createIssueType
      );

      operations.push({
        type: "create_issue",
        reason:
          classification === "bug"
            ? "Defect work should preserve a separate issue history with explicit links back to the affected delivery item."
            : "New scope should be tracked in its own work item instead of inflating the current ticket.",
        highImpact: classification === "new_scope" || impactAnalysis.releaseRisk !== "low",
        payload: {
          projectKey,
          issueType: issueTypeName,
          summary:
            input.createSummary ??
            buildCreateSummary(input.issueKey, input.summary, classification),
          description: input.description ?? input.summary
        }
      });

      operations.push({
        type: "link_issues",
        reason:
          "The new work item should stay traceable to the original request through an explicit Jira link.",
        highImpact: false,
        payload: {
          typeName: classification === "bug" ? "Blocks" : "Relates",
          inwardIssueKey: input.issueKey,
          outwardIssueKey: "__CREATED_ISSUE__"
        }
      });
    }

    for (const adjustment of input.dependencyAdjustments ?? []) {
      if (adjustment.action === "remove") {
        if (!adjustment.existingLinkId) {
          operations.push({
            type: "manual_step",
            reason:
              "Dependency removal needs the existing link ID so the relink plan stays audit-safe.",
            highImpact: true,
            payload: adjustment
          });
          continue;
        }

        operations.push({
          type: "delete_issue_link",
          reason: "The approved change plan removes an obsolete dependency edge.",
          highImpact: true,
          payload: {
            linkId: adjustment.existingLinkId,
            sourceIssueKey: adjustment.sourceIssueKey,
            targetIssueKey: adjustment.targetIssueKey
          }
        });
        continue;
      }

      operations.push({
        type: "link_issues",
        reason: "The approved change plan adds an explicit dependency edge.",
        highImpact: true,
        payload: {
          typeName: adjustment.typeName ?? "Blocks",
          inwardIssueKey: adjustment.sourceIssueKey,
          outwardIssueKey: adjustment.targetIssueKey
        }
      });
    }

    const notes = dedupe([
      ...impactAnalysis.notes,
      ...(classificationResult.classification === "ambiguous"
        ? classificationResult.decisionPoints
        : []),
      ...(operations.some((operation) => operation.type === "manual_step")
        ? ["Manual intervention is still required before the full change can be applied."]
        : [])
    ]);
    const approvalGate = this.evaluateApprovalGate({
      classification,
      releaseRisk: impactAnalysis.releaseRisk,
      operations,
      affectedIssues: impactAnalysis.affectedIssues
    });
    const decisionLog = buildChangeDecisionLogEntry({
      issueKey: input.issueKey,
      classification,
      changeSummary: input.summary,
      releaseRisk: impactAnalysis.releaseRisk,
      approvalRequired: approvalGate.approvalRequired,
      affectedIssueKeys: impactAnalysis.affectedIssues.map((issue) => issue.issueKey),
      operationSummaries: operations.map((operation) =>
        `${operation.type}:${operation.reason}`
      ),
      notes
    });

    if (decisionLog.body) {
      operations.push({
        type: "add_comment",
        reason:
          "Every approved change plan should leave a concise decision log on the anchor issue.",
        highImpact: false,
        payload: {
          issueKey: input.issueKey,
          comment: decisionLog.body
        }
      });
    }

    return {
      issueKey: input.issueKey,
      classification,
      projectKey,
      impactAnalysis,
      operations,
      approvalGate,
      decisionLog,
      manualStepsRequired: operations.some((operation) => operation.type === "manual_step"),
      notes
    };
  }

  async planChangeDecisionLog(
    input: ChangeExecutionInput
  ): Promise<ChangeDecisionLogEntry> {
    return (await this.planChangeExecution(input)).decisionLog;
  }

  async evaluateChangeApproval(
    input: ChangeExecutionInput
  ): Promise<ChangeApprovalGateResult & { operations: PlannedChangeOperation[] }> {
    const plan = await this.planChangeExecution(input);

    return {
      ...plan.approvalGate,
      operations: plan.operations
    };
  }

  private evaluateApprovalGate(input: {
    classification: ChangeClassification;
    releaseRisk: ChangeReleaseRisk;
    operations: PlannedChangeOperation[];
    affectedIssues: ChangeImpactAnalysis["affectedIssues"];
  }): ChangeApprovalGateResult {
    const reasons: string[] = [];
    let riskLevel: ChangeApprovalRisk = "low";

    if (input.classification === "ambiguous") {
      riskLevel = "critical";
      reasons.push("The change classification is ambiguous.");
    }

    if (input.releaseRisk === "high") {
      riskLevel = maxRiskLevel(riskLevel, "high");
      reasons.push("The impact analysis marked the change as high release risk.");
    } else if (input.releaseRisk === "medium") {
      riskLevel = maxRiskLevel(riskLevel, "medium");
      reasons.push("The change touches multiple issues or one dependency edge.");
    }

    if (
      input.operations.some(
        (operation) =>
          operation.type === "delete_issue_link" ||
          operation.type === "transition_issue"
      )
    ) {
      riskLevel = maxRiskLevel(riskLevel, "high");
      reasons.push("The plan includes lifecycle or dependency mutation.");
    }

    if (input.operations.filter((operation) => operation.highImpact).length >= 2) {
      riskLevel = maxRiskLevel(riskLevel, "high");
      reasons.push("The plan contains multiple high-impact Jira mutations.");
    }

    if (
      input.affectedIssues.some(
        (issue) =>
          issue.semantic === "done" ||
          issue.semantic === "review" ||
          issue.semantic === "qa"
      )
    ) {
      riskLevel = maxRiskLevel(riskLevel, "high");
      reasons.push("The change touches already-reviewed or completed work.");
    }

    const approvalRequired = riskLevel === "high" || riskLevel === "critical";

    return {
      approvalRequired,
      riskLevel,
      reasons,
      recommendedAction: approvalRequired
        ? "Require explicit human approval before applying this change plan."
        : "This change plan can proceed without a separate approval gate."
    };
  }

  private async loadIssue(issueKey: string): Promise<ChangeContextIssue> {
    return (await this.jiraApi.getIssue(issueKey, [
      "summary",
      "description",
      "status",
      "labels",
      "issuetype",
      "parent",
      "project",
      "issuelinks"
    ])) as ChangeContextIssue;
  }

  private async loadRelatedIssues(
    anchor: ChangeContextIssue | undefined,
    relatedIssueKeys?: string[]
  ): Promise<{
    byKey: Map<string, ChangeContextIssue>;
    explicitIssues: ChangeContextIssue[];
  }> {
    const anchorDependencySnapshot = anchor
      ? buildIssueDependencySnapshot(anchor)
      : undefined;
    const candidateKeys = dedupe(
      [
        anchor?.fields?.parent?.key,
        ...(anchorDependencySnapshot?.blockedBy.map((issue) => issue.issueKey) ?? []),
        ...(anchorDependencySnapshot?.blocks.map((issue) => issue.issueKey) ?? []),
        ...(anchorDependencySnapshot?.related.map((issue) => issue.issueKey) ?? []),
        ...(relatedIssueKeys ?? [])
      ].filter(Boolean) as string[]
    );
    const issues = await Promise.all(candidateKeys.map((key) => this.loadIssue(key)));
    const byKey = new Map(
      issues.filter((issue) => issue.key).map((issue) => [issue.key as string, issue])
    );
    const explicitIssues = (relatedIssueKeys ?? [])
      .map((key) => byKey.get(key))
      .filter((issue): issue is ChangeContextIssue => Boolean(issue));

    return { byKey, explicitIssues };
  }

  private async planReopenOperation(
    issueKey: string
  ): Promise<PlannedChangeOperation | undefined> {
    const transitions = await this.jiraApi.getTransitions(issueKey);
    const preferred = transitions.transitions.find((transition) => {
      const semantic = inferWorkflowSemantic({
        statusName: transition.to?.name,
        statusCategoryKey: transition.to?.statusCategory?.key
      });

      return semantic === "in_progress" || semantic === "ready" || semantic === "todo";
    });

    if (!preferred?.id) {
      return {
        type: "manual_step",
        reason:
          "No safe reopen-like transition was discovered. A human should choose the correct Jira lifecycle move.",
        highImpact: true,
        payload: {
          issueKey,
          availableTransitions: transitions.transitions.map((transition) => transition.name)
        }
      };
    }

    return {
      type: "transition_issue",
      reason:
        "The approved change plan moves the affected issue back into an active or ready state.",
      highImpact: true,
      payload: {
        issueKey,
        transitionId: preferred.id,
        transitionName: preferred.name
      }
    };
  }

  private async resolveCreateIssueType(
    projectKey: string,
    classification: ChangeClassification,
    requestedType?: string
  ): Promise<string> {
    if (requestedType) {
      return requestedType;
    }

    const project = await this.jiraApi.getProject(projectKey);
    const issueTypes = project.issueTypes ?? [];
    const names = issueTypes
      .map((issueType) => issueType.name)
      .filter((name): name is string => Boolean(name));

    if (classification === "bug") {
      const bugType = findIssueType(issueTypes, ["Bug", "Task"]);

      if (bugType?.name) {
        return bugType.name;
      }
    }

    const scopeType = findIssueType(issueTypes, ["Story", "Task", "Feature"]);

    if (scopeType?.name) {
      return scopeType.name;
    }

    return names[0] ?? "Task";
  }
}

function buildImpactIssue(
  issue: ChangeContextIssue | undefined,
  relation:
    | "self"
    | "parent"
    | "blocked_by"
    | "blocks"
    | "related"
    | "explicit",
  classification: ChangeClassification
):
  | {
      issueKey: string;
      summary?: string;
      relation:
        | "self"
        | "parent"
        | "blocked_by"
        | "blocks"
        | "related"
        | "explicit";
      statusName?: string;
      semantic: ReturnType<typeof inferWorkflowSemantic>;
      recommendedAction: ChangeImpactAction;
    }
  | undefined {
  if (!issue?.key) {
    return undefined;
  }

  const semantic = inferWorkflowSemantic({
    statusName: issue.fields?.status?.name,
    statusCategoryKey: issue.fields?.status?.statusCategory?.key
  });
  let recommendedAction: ChangeImpactAction = "monitor";

  if (
    (classification === "bug" || classification === "reopen") &&
    (semantic === "done" || semantic === "review" || semantic === "qa")
  ) {
    recommendedAction = "reopen_candidate";
  } else if (relation === "blocked_by" || relation === "blocks") {
    recommendedAction = "relink_review";
  } else if (
    (classification === "change_request" || classification === "new_scope") &&
    relation === "self"
  ) {
    recommendedAction = "split_candidate";
  }

  return {
    issueKey: issue.key,
    ...(issue.fields?.summary ? { summary: issue.fields.summary } : {}),
    relation,
    ...(issue.fields?.status?.name ? { statusName: issue.fields.status.name } : {}),
    semantic,
    recommendedAction
  };
}

function buildDependencyImpactIssues(
  issue: ChangeContextIssue,
  classification: ChangeClassification
) {
  const snapshot = buildIssueDependencySnapshot(issue);

  return [
    ...snapshot.blockedBy.map((dependency) =>
      buildImpactIssue(
        buildSyntheticIssueFromDependency(dependency),
        "blocked_by",
        classification
      )
    ),
    ...snapshot.blocks.map((dependency) =>
      buildImpactIssue(
        buildSyntheticIssueFromDependency(dependency),
        "blocks",
        classification
      )
    )
  ].filter(Boolean);
}

function buildRelatedImpactIssues(
  issue: ChangeContextIssue,
  classification: ChangeClassification
) {
  const snapshot = buildIssueDependencySnapshot(issue);

  return snapshot.related
    .map((dependency) =>
      buildImpactIssue(
        buildSyntheticIssueFromDependency(dependency),
        "related",
        classification
      )
    )
    .filter(Boolean);
}

function buildCreateSummary(
  issueKey: string,
  summary: string,
  classification: ChangeClassification
): string {
  if (classification === "bug") {
    return `[Bug] ${issueKey} ${summary}`.trim();
  }

  return `[Change] ${issueKey} ${summary}`.trim();
}

function maxRiskLevel(
  current: ChangeApprovalRisk,
  candidate: ChangeApprovalRisk
): ChangeApprovalRisk {
  const order: Record<ChangeApprovalRisk, number> = {
    low: 1,
    medium: 2,
    high: 3,
    critical: 4
  };

  return order[candidate] > order[current] ? candidate : current;
}

function findIssueType(
  issueTypes: JiraIssueTypeDefinition[],
  preferredNames: string[]
): JiraIssueTypeDefinition | undefined {
  for (const preferredName of preferredNames) {
    const match = issueTypes.find(
      (issueType) =>
        issueType.name?.trim().toLowerCase() === preferredName.toLowerCase()
    );

    if (match) {
      return match;
    }
  }

  return issueTypes.find((issueType) => issueType.subtask !== true);
}

function buildSyntheticIssueFromDependency(dependency: {
  issueKey: string;
  summary?: string;
  statusName?: string;
  statusCategoryKey?: string;
}): ChangeContextIssue {
  return {
    ...(dependency.issueKey ? { key: dependency.issueKey } : {}),
    fields: {
      ...(dependency.summary ? { summary: dependency.summary } : {}),
      ...(dependency.statusName || dependency.statusCategoryKey
        ? {
            status: {
              ...(dependency.statusName ? { name: dependency.statusName } : {}),
              ...(dependency.statusCategoryKey
                ? {
                    statusCategory: {
                      key: dependency.statusCategoryKey
                    }
                  }
                : {})
            }
          }
        : {})
    }
  };
}
