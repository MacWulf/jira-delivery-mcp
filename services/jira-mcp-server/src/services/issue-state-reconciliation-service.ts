import {
  buildReconciliationAuditComment,
  type IssueStateReconciliationApplyResult,
  type IssueStateReconciliationPlan,
  type ReconciliationSemantic
} from "../domain/state-reconciliation.js";
import type { JiraIssueForSelection, JiraTransition } from "../policy/assistant-policy.js";
import { evaluateIssueReadiness } from "../policy/readiness-policy.js";
import { buildIssueStateReconciliationPlan } from "../policy/state-reconciliation-policy.js";
import { inferWorkflowSemantic } from "../policy/workflow-semantics.js";
import type { JiraApi } from "./jira-api.js";
import type { WorkflowDiscoveryService } from "./workflow-discovery-service.js";

type ReconciliationIssue = JiraIssueForSelection & {
  fields?: JiraIssueForSelection["fields"] & {
    project?: {
      key?: string;
      name?: string;
    };
    comment?: {
      total?: number;
    };
    worklog?: {
      total?: number;
    };
  };
};

export class IssueStateReconciliationService {
  constructor(
    private readonly jiraApi: JiraApi,
    private readonly workflowDiscoveryService: WorkflowDiscoveryService
  ) {}

  async planIssueStateReconciliation(input: {
    issueKey: string;
    targetSemanticHint?: ReconciliationSemantic;
    intentStage?: "select" | "start" | "handoff" | "close";
    reason?: string;
  }): Promise<IssueStateReconciliationPlan> {
    const issue = await this.loadIssue(input.issueKey);
    const transitions = await this.jiraApi.getTransitions(input.issueKey);
    const projectKey = issue.fields?.project?.key;
    const workflowSnapshot = projectKey
      ? await this.safeDiscoverWorkflow(projectKey)
      : undefined;
    const readiness = {
      select: evaluateIssueReadiness(issue, "select"),
      start: evaluateIssueReadiness(issue, "start"),
      handoff: evaluateIssueReadiness(issue, "handoff", {
        availableTransitions: transitions.transitions
      }),
      close: evaluateIssueReadiness(issue, "close", {
        availableTransitions: transitions.transitions
      })
    };

    return buildIssueStateReconciliationPlan({
      issue,
      transitions: transitions.transitions,
      ...(workflowSnapshot ? { workflowSnapshot } : {}),
      readiness,
      ...(input.intentStage ? { intentStage: input.intentStage } : {}),
      ...(input.targetSemanticHint
        ? { targetSemanticHint: input.targetSemanticHint }
        : {}),
      ...(input.reason ? { reason: input.reason } : {})
    });
  }

  async applyIssueStateReconciliation(input: {
    issueKey: string;
    targetSemanticHint?: ReconciliationSemantic;
    intentStage?: "select" | "start" | "handoff" | "close";
    reason?: string;
  }): Promise<IssueStateReconciliationApplyResult> {
    const plan = await this.planIssueStateReconciliation(input);
    const beforeIssue = await this.loadIssue(input.issueKey);
    const statusBefore = beforeIssue.fields?.status?.name;

    if (plan.status !== "ready_to_apply") {
      return {
        ...plan,
        applied: false,
        executedPath: [],
        auditComment: buildReconciliationAuditComment({
          issueKey: plan.issueKey,
          ...(statusBefore ? { statusBefore } : {}),
          ...(beforeIssue.fields?.status?.name
            ? { statusAfter: beforeIssue.fields.status.name }
            : {}),
          currentSemantic: plan.currentSemantic,
          ...(plan.targetSemantic ? { targetSemantic: plan.targetSemantic } : {}),
          reason: plan.reason,
          path: [],
          bypassedChecks: plan.bypassedChecks
        })
      };
    }

    const executedPath = [];

    for (const step of plan.path) {
      const liveIssue = await this.loadIssue(input.issueKey);
      const liveStatus = liveIssue.fields?.status?.name;
      const liveSemantic = inferWorkflowSemantic({
        statusName: liveIssue.fields?.status?.name,
        statusCategoryKey: liveIssue.fields?.status?.statusCategory?.key
      });

      if (liveSemantic !== step.fromSemantic) {
        throw new Error(
          `Issue ${input.issueKey} changed unexpectedly during reconciliation. Expected ${step.fromSemantic}, but Jira now reports ${liveSemantic} (${liveStatus ?? "unknown"}).`
        );
      }

      const transitions = await this.jiraApi.getTransitions(input.issueKey);
      const transition = resolveLiveTransition(transitions.transitions, step);

      if (!transition) {
        throw new Error(
          `Reconciliation transition '${step.transitionName}' is no longer available for ${input.issueKey}. Manual Jira follow-up may be required.`
        );
      }

      const isLast = step.index === plan.path.length;
      const auditComment = isLast
        ? buildReconciliationAuditComment({
            issueKey: plan.issueKey,
            ...(statusBefore ? { statusBefore } : {}),
            ...(transition.to?.name ? { statusAfter: transition.to.name } : {}),
            currentSemantic: plan.currentSemantic,
            ...(plan.targetSemantic ? { targetSemantic: plan.targetSemantic } : {}),
            reason: plan.reason,
            path: plan.path,
            bypassedChecks: plan.bypassedChecks
          })
        : undefined;

      await this.jiraApi.transitionIssue({
        issueKey: input.issueKey,
        transitionId: transition.id,
        ...(auditComment ? { comment: auditComment } : {})
      });

      executedPath.push({
        ...step,
        transitionId: transition.id
      });
    }

    const finalIssue = await this.loadIssue(input.issueKey);
    const statusAfter = finalIssue.fields?.status?.name;
    const semanticAfter = inferWorkflowSemantic({
      statusName: finalIssue.fields?.status?.name,
      statusCategoryKey: finalIssue.fields?.status?.statusCategory?.key
    });
    const auditComment = buildReconciliationAuditComment({
      issueKey: plan.issueKey,
      ...(statusBefore ? { statusBefore } : {}),
      ...(statusAfter ? { statusAfter } : {}),
      currentSemantic: plan.currentSemantic,
      ...(plan.targetSemantic ? { targetSemantic: plan.targetSemantic } : {}),
      reason: plan.reason,
      path: plan.path,
      bypassedChecks: plan.bypassedChecks
    });

    return {
      ...plan,
      applied: true,
      ...(statusBefore ? { statusBefore } : {}),
      ...(statusAfter ? { statusAfter } : {}),
      semanticAfter,
      executedPath,
      auditComment
    };
  }

  private async loadIssue(issueKey: string): Promise<ReconciliationIssue> {
    return (await this.jiraApi.getIssue(issueKey, [
      "summary",
      "description",
      "status",
      "priority",
      "labels",
      "issuetype",
      "parent",
      "issuelinks",
      "project",
      "comment",
      "worklog"
    ])) as ReconciliationIssue;
  }

  private async safeDiscoverWorkflow(projectKey: string) {
    try {
      return await this.workflowDiscoveryService.discoverProjectWorkflow(projectKey);
    } catch {
      return undefined;
    }
  }
}

function resolveLiveTransition(
  transitions: JiraTransition[],
  step: IssueStateReconciliationPlan["path"][number]
): JiraTransition | undefined {
  const normalizedName = normalize(step.transitionName);

  return transitions.find((transition) => {
    const toSemantic = inferWorkflowSemantic({
      statusName: transition.to?.name,
      statusCategoryKey: transition.to?.statusCategory?.key
    });

    return (
      normalize(transition.name) === normalizedName &&
      toSemantic === step.toSemantic
    );
  });
}

function normalize(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase();
}
