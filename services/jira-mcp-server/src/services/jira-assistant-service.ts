import type { AppConfig } from "../config.js";
import {
  parseIssueExecutionMetadataFromDescription,
  type IssueExecutionMetadata
} from "../domain/issue-execution-metadata.js";
import {
  findTransitionByName,
  hasOpenBlockingDependency,
  isDoneIssue,
  type JiraIssueForSelection,
  type JiraTransition
} from "../policy/assistant-policy.js";
import {
  buildIssueDependencySnapshot,
  type IssueDependencySnapshot
} from "../policy/dependency-policy.js";
import {
  buildDependencyStatusSignals,
  type DependencyStatusSignal
} from "../policy/dependency-status-policy.js";
import {
  buildDependencyImpactSummary,
  type DependencyImpactSummary
} from "../policy/dependency-impact-policy.js";
import {
  evaluateIssueReadiness,
  summarizeReadinessFailures,
  type IssueReadinessEvaluation,
  type IssueReadinessStage
} from "../policy/readiness-policy.js";
import { inferWorkflowSemantic } from "../policy/workflow-semantics.js";
import type { JiraApi } from "./jira-api.js";

export type TransitionPlan = {
  issueKey: string;
  summary?: string;
  transitionId: string;
  transitionName: string;
  availableTransitions: string[];
  dependencySnapshot: IssueDependencySnapshot;
  dependencyStatusSignals: DependencyStatusSignal[];
  dependencyImpactSummary: DependencyImpactSummary;
  executionMetadata?: IssueExecutionMetadata;
  requiredSkills: string[];
  optionalSkills: string[];
  readinessEvaluation: IssueReadinessEvaluation;
};

export class JiraAssistantService {
  constructor(
    private readonly jiraApi: JiraApi,
    private readonly config: AppConfig
  ) {}

  async planStartIssueWork(
    issueKey: string,
    preferredTransitionName?: string
  ): Promise<TransitionPlan> {
    const issue = await this.loadIssueForLifecycle(issueKey);
    this.assertLifecycleGate(issueKey, issue, "start", "started");

    return this.resolveTransition(
      issueKey,
      preferredTransitionName,
      this.config.inProgressTransitionNames,
      "start"
    );
  }

  async planHandoffIssue(
    issueKey: string,
    preferredTransitionName?: string
  ): Promise<TransitionPlan> {
    const issue = await this.loadIssueForLifecycle(issueKey);
    this.assertLifecycleGate(issueKey, issue, "handoff", "handed off");

    return this.resolveTransition(
      issueKey,
      preferredTransitionName,
      this.config.reviewTransitionNames,
      "handoff"
    );
  }

  async planCloseIssueIfReady(
    issueKey: string,
    preferredTransitionName?: string
  ): Promise<TransitionPlan> {
    const issue = await this.loadIssueForLifecycle(issueKey);
    const transitions = await this.jiraApi.getTransitions(issueKey);
    this.assertLifecycleGate(
      issueKey,
      issue,
      "close",
      "closed",
      transitions.transitions
    );
    const transition = this.selectTransition(
      transitions.transitions,
      preferredTransitionName,
      this.config.doneTransitionNames
    );

    if (!transition) {
      throw new Error(
        `No matching transition found for ${issueKey}. Available: ${transitions.transitions
          .map((item) => item.name)
          .join(", ")}`
      );
    }

    return this.buildTransitionPlan(
      issueKey,
      issue,
      transitions.transitions,
      transition,
      "close"
    );
  }

  async planSelectIssueForWork(
    issueKey: string,
    preferredTransitionName?: string
  ): Promise<TransitionPlan> {
    const issue = await this.loadIssueForLifecycle(issueKey);
    this.assertLifecycleGate(issueKey, issue, "select", "selected for work");

    return this.resolveTransition(
      issueKey,
      preferredTransitionName,
      this.config.selectedTransitionNames,
      "select"
    );
  }

  async planSendIssueToQa(
    issueKey: string,
    preferredTransitionName?: string
  ): Promise<TransitionPlan> {
    const issue = await this.loadIssueForLifecycle(issueKey);
    this.assertLifecycleGate(issueKey, issue, "handoff", "sent to QA");

    return this.resolveTransition(
      issueKey,
      preferredTransitionName,
      this.config.qaTransitionNames,
      "handoff"
    );
  }

  async planMarkIssueBlocked(
    issueKey: string,
    preferredTransitionName?: string
  ): Promise<TransitionPlan> {
    const issue = await this.loadIssueForLifecycle(issueKey);

    if (isDoneIssue(issue)) {
      throw new Error(`Issue ${issueKey} is already in a done category.`);
    }

    return this.resolveTransition(
      issueKey,
      preferredTransitionName,
      this.config.blockedTransitionNames
    );
  }

  async planTransitionIssueByName(
    issueKey: string,
    transitionName: string
  ): Promise<TransitionPlan> {
    const issue = await this.loadIssueForLifecycle(issueKey);
    const transitions = await this.jiraApi.getTransitions(issueKey);
    const transition = findTransitionByName(transitions.transitions, transitionName);

    if (!transition) {
      throw new Error(
        `Transition '${transitionName}' is not available for ${issueKey}.`
      );
    }

    const stage = inferLifecycleGuardStage(transition);

    if (stage) {
      this.assertLifecycleGate(
        issueKey,
        issue,
        stage,
        describeLifecycleAction(transition.name, stage),
        transitions.transitions
      );
    } else if (isDoneIssue(issue)) {
      throw new Error(`Issue ${issueKey} is already in a done category.`);
    }

    return this.buildTransitionPlan(issueKey, issue, transitions.transitions, transition, stage);
  }

  async planTransitionIssueById(
    issueKey: string,
    transitionId: string
  ): Promise<TransitionPlan> {
    const issue = await this.loadIssueForLifecycle(issueKey);
    const transitions = await this.jiraApi.getTransitions(issueKey);
    const transition = transitions.transitions.find((item) => item.id === transitionId);

    if (!transition) {
      throw new Error(
        `Transition '${transitionId}' is not available for ${issueKey}.`
      );
    }

    const stage = inferLifecycleGuardStage(transition);

    if (stage) {
      this.assertLifecycleGate(
        issueKey,
        issue,
        stage,
        describeLifecycleAction(transition.name, stage),
        transitions.transitions
      );
    } else if (isDoneIssue(issue)) {
      throw new Error(`Issue ${issueKey} is already in a done category.`);
    }

    return this.buildTransitionPlan(issueKey, issue, transitions.transitions, transition, stage);
  }

  private async loadIssueForLifecycle(
    issueKey: string
  ): Promise<JiraIssueForSelection> {
    return (await this.jiraApi.getIssue(issueKey, [
      "summary",
      "description",
      "status",
      "priority",
      "labels",
      "issuetype",
      "parent",
      "issuelinks"
    ])) as JiraIssueForSelection;
  }

  private async resolveTransition(
    issueKey: string,
    preferredTransitionName: string | undefined,
    fallbackNames: string[],
    stage?: IssueReadinessStage
  ): Promise<TransitionPlan> {
    const transitions = await this.jiraApi.getTransitions(issueKey);
    const transition = this.selectTransition(
      transitions.transitions,
      preferredTransitionName,
      fallbackNames
    );

    if (!transition) {
      throw new Error(
        `No matching transition found for ${issueKey}. Available: ${transitions.transitions
          .map((item) => item.name)
          .join(", ")}`
      );
    }

    const issue = await this.loadIssueForLifecycle(issueKey);
    return this.buildTransitionPlan(issueKey, issue, transitions.transitions, transition, stage);
  }

  private buildTransitionPlan(
    issueKey: string,
    issue: JiraIssueForSelection,
    transitions: JiraTransition[],
    transition: JiraTransition,
    stage?: IssueReadinessStage
  ): TransitionPlan {
    const executionData = parseIssueExecutionMetadataFromDescription(
      issue.fields?.description
    );
    const readinessEvaluation = evaluateIssueReadiness(
      issue,
      stage ?? inferReadinessStageFromTransitionName(transition),
      { availableTransitions: transitions }
    );

    return {
      issueKey,
      transitionId: transition.id,
      transitionName: transition.name,
      availableTransitions: transitions.map((item) => item.name),
      dependencySnapshot: buildIssueDependencySnapshot(issue),
      dependencyStatusSignals: buildDependencyStatusSignals(issue),
      dependencyImpactSummary: buildDependencyImpactSummary(issue),
      requiredSkills:
        executionData.executionMetadata?.requiredSkills.map((item) => item.value) ??
        [],
      optionalSkills:
        executionData.executionMetadata?.optionalSkills.map((item) => item.value) ??
        [],
      readinessEvaluation,
      ...(issue.fields?.summary ? { summary: issue.fields.summary } : {}),
      ...(executionData.executionMetadata
        ? { executionMetadata: executionData.executionMetadata }
        : {})
    };
  }

  private assertLifecycleGate(
    issueKey: string,
    issue: JiraIssueForSelection,
    stage: IssueReadinessStage,
    actionLabel: string,
    availableTransitions?: JiraTransition[]
  ): void {
    if (isDoneIssue(issue)) {
      throw new Error(`Issue ${issueKey} is already in a done category.`);
    }

    this.assertReadiness(issue, stage, availableTransitions);

    if (hasOpenBlockingDependency(issue)) {
      throw new Error(
        `Issue ${issueKey} still has an open prerequisite dependency and must not be ${actionLabel}. Complete the prerequisite first, or explicitly re-evaluate and remove the dependency if it is no longer justified.`
      );
    }
  }

  private assertReadiness(
    issue: JiraIssueForSelection,
    stage: IssueReadinessStage,
    availableTransitions?: JiraTransition[]
  ): void {
    const readiness = evaluateIssueReadiness(
      issue,
      stage,
      availableTransitions ? { availableTransitions } : undefined
    );

    if (!readiness.passed) {
      throw new Error(summarizeReadinessFailures(readiness));
    }
  }

  private selectTransition(
    transitions: JiraTransition[],
    preferredTransitionName: string | undefined,
    fallbackNames: string[]
  ): JiraTransition | undefined {
    if (preferredTransitionName) {
      return findTransitionByName(transitions, preferredTransitionName);
    }

    for (const name of fallbackNames) {
      const match = findTransitionByName(transitions, name);

      if (match) {
        return match;
      }
    }

    return undefined;
  }
}

function inferReadinessStageFromTransitionName(
  transition: JiraTransition
): IssueReadinessStage {
  const candidates = [transition.name, transition.to?.name]
    .map((value) => (value ?? "").trim().toLowerCase())
    .filter(Boolean);

  if (candidates.some((value) => value.includes("qa") || value.includes("testing"))) {
    return "handoff";
  }

  if (candidates.some((value) => value.includes("review"))) {
    return "handoff";
  }

  if (candidates.some((value) => value.includes("done") || value.includes("accepted") || value.includes("closed"))) {
    return "close";
  }

  if (candidates.some((value) => value.includes("selected") || value.includes("ready"))) {
    return "select";
  }

  return "start";
}

function inferLifecycleGuardStage(
  transition: JiraTransition
): IssueReadinessStage | undefined {
  const targetSemantic = inferWorkflowSemantic({
    statusName: transition.to?.name,
    statusCategoryKey: transition.to?.statusCategory?.key
  });
  const candidates = [transition.name, transition.to?.name]
    .map((value) => (value ?? "").trim().toLowerCase())
    .filter(Boolean);

  if (
    targetSemantic === "blocked" ||
    candidates.some((value) => value.includes("blocked")) ||
    candidates.some((value) => value.includes("return to do")) ||
    candidates.some((value) => value.includes("request changes")) ||
    candidates.some((value) => value.includes("reopen"))
  ) {
    return undefined;
  }

  if (targetSemantic === "done") {
    return "close";
  }

  if (targetSemantic === "qa" || targetSemantic === "review") {
    return "handoff";
  }

  if (targetSemantic === "ready") {
    return "select";
  }

  if (targetSemantic === "in_progress") {
    return "start";
  }

  return undefined;
}

function describeLifecycleAction(
  transitionName: string,
  stage: IssueReadinessStage
): string {
  switch (stage) {
    case "select":
      return "selected for work";
    case "start":
      return "moved into active work";
    case "handoff":
      return transitionName.trim() ? `'${transitionName}'-ed` : "handed off";
    case "close":
      return "closed";
    default:
      return "advanced";
  }
}
