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
import type { JiraApi } from "./jira-api.js";

export type TransitionPlan = {
  issueKey: string;
  summary?: string;
  transitionId: string;
  transitionName: string;
  availableTransitions: string[];
  dependencySnapshot: IssueDependencySnapshot;
  dependencyStatusSignals: DependencyStatusSignal[];
  executionMetadata?: IssueExecutionMetadata;
  requiredSkills: string[];
  optionalSkills: string[];
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

    if (isDoneIssue(issue)) {
      throw new Error(`Issue ${issueKey} is already in a done category.`);
    }

    if (hasOpenBlockingDependency(issue)) {
      throw new Error(
        `Issue ${issueKey} has an open blocking dependency and should not be started yet.`
      );
    }

    return this.resolveTransition(
      issueKey,
      preferredTransitionName,
      this.config.inProgressTransitionNames
    );
  }

  async planHandoffIssue(
    issueKey: string,
    preferredTransitionName?: string
  ): Promise<TransitionPlan> {
    const issue = await this.loadIssueForLifecycle(issueKey);

    if (isDoneIssue(issue)) {
      throw new Error(`Issue ${issueKey} is already in a done category.`);
    }

    if (hasOpenBlockingDependency(issue)) {
      throw new Error(
        `Issue ${issueKey} still has an open blocking dependency and should not be handed off yet.`
      );
    }

    return this.resolveTransition(
      issueKey,
      preferredTransitionName,
      this.config.reviewTransitionNames
    );
  }

  async planCloseIssueIfReady(
    issueKey: string,
    preferredTransitionName?: string
  ): Promise<TransitionPlan> {
    const issue = await this.loadIssueForLifecycle(issueKey);

    if (isDoneIssue(issue)) {
      throw new Error(`Issue ${issueKey} is already in a done category.`);
    }

    if (hasOpenBlockingDependency(issue)) {
      throw new Error(
        `Issue ${issueKey} has an open blocking dependency and should not be closed.`
      );
    }

    return this.resolveTransition(
      issueKey,
      preferredTransitionName,
      this.config.doneTransitionNames
    );
  }

  async planSelectIssueForWork(
    issueKey: string,
    preferredTransitionName?: string
  ): Promise<TransitionPlan> {
    const issue = await this.loadIssueForLifecycle(issueKey);

    if (isDoneIssue(issue)) {
      throw new Error(`Issue ${issueKey} is already in a done category.`);
    }

    if (hasOpenBlockingDependency(issue)) {
      throw new Error(
        `Issue ${issueKey} has an open blocking dependency and should not be selected for work yet.`
      );
    }

    return this.resolveTransition(
      issueKey,
      preferredTransitionName,
      this.config.selectedTransitionNames
    );
  }

  async planSendIssueToQa(
    issueKey: string,
    preferredTransitionName?: string
  ): Promise<TransitionPlan> {
    const issue = await this.loadIssueForLifecycle(issueKey);

    if (isDoneIssue(issue)) {
      throw new Error(`Issue ${issueKey} is already in a done category.`);
    }

    if (hasOpenBlockingDependency(issue)) {
      throw new Error(
        `Issue ${issueKey} has an open blocking dependency and should not be sent to QA.`
      );
    }

    return this.resolveTransition(
      issueKey,
      preferredTransitionName,
      this.config.qaTransitionNames
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

  private async loadIssueForLifecycle(
    issueKey: string
  ): Promise<JiraIssueForSelection> {
    return (await this.jiraApi.getIssue(issueKey, [
      "summary",
      "description",
      "status",
      "priority",
      "issuelinks"
    ])) as JiraIssueForSelection;
  }

  private async resolveTransition(
    issueKey: string,
    preferredTransitionName: string | undefined,
    fallbackNames: string[]
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
    const executionData = parseIssueExecutionMetadataFromDescription(
      issue.fields?.description
    );

    return {
      issueKey,
      transitionId: transition.id,
      transitionName: transition.name,
      availableTransitions: transitions.transitions.map((item) => item.name),
      dependencySnapshot: buildIssueDependencySnapshot(issue),
      dependencyStatusSignals: buildDependencyStatusSignals(issue),
      requiredSkills:
        executionData.executionMetadata?.requiredSkills.map((item) => item.value) ??
        [],
      optionalSkills:
        executionData.executionMetadata?.optionalSkills.map((item) => item.value) ??
        [],
      ...(issue.fields?.summary ? { summary: issue.fields.summary } : {}),
      ...(executionData.executionMetadata
        ? { executionMetadata: executionData.executionMetadata }
        : {})
    };
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
