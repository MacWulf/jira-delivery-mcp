import { inferWorkflowSemantic } from "../policy/workflow-semantics.js";
import type { JiraApi } from "./jira-api.js";
import type { JiraAssistantService, TransitionPlan } from "./jira-assistant-service.js";

type ProgressIssue = {
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

export type IssueProgressSyncPlan = {
  issueKey: string;
  summary?: string;
  statusBefore?: string;
  semanticBefore: ReturnType<typeof inferWorkflowSemantic>;
  targetState: "already-active" | "in-progress" | "selected-fallback";
  transition?: {
    transitionId: string;
    transitionName: string;
  };
  notes: string[];
  manualStepRequired: boolean;
};

export type IssueProgressSyncResult = IssueProgressSyncPlan & {
  statusAfter?: string;
  semanticAfter: ReturnType<typeof inferWorkflowSemantic>;
  progressCommentAdded: boolean;
  worklogAdded: boolean;
};

export class IssueProgressService {
  constructor(
    private readonly jiraApi: JiraApi,
    private readonly assistantService: JiraAssistantService
  ) {}

  async planIssueProgressSync(
    issueKey: string,
    preferredTransitionName?: string
  ): Promise<IssueProgressSyncPlan> {
    const issue = await this.loadIssue(issueKey);
    const summary = issue.fields?.summary;
    const statusBefore = issue.fields?.status?.name;
    const semanticBefore = inferWorkflowSemantic({
      statusName: issue.fields?.status?.name,
      statusCategoryKey: issue.fields?.status?.statusCategory?.key
    });

    if (semanticBefore === "done" || semanticBefore === "canceled") {
      throw new Error(
        `Issue ${issueKey} is already in a terminal state (${statusBefore ?? "unknown"}).`
      );
    }

    if (semanticBefore === "in_progress") {
      return {
        issueKey,
        ...(summary ? { summary } : {}),
        ...(statusBefore ? { statusBefore } : {}),
        semanticBefore,
        targetState: "already-active",
        notes: [
          "The issue is already in an active in-progress state, so only progress logging is needed."
        ],
        manualStepRequired: false
      };
    }

    const startPlan = await this.tryPlan(() =>
      this.assistantService.planStartIssueWork(
        issueKey,
        preferredTransitionName
      )
    );

    if (startPlan) {
      return {
        issueKey,
        ...(summary ? { summary } : {}),
        ...(statusBefore ? { statusBefore } : {}),
        semanticBefore,
        targetState: "in-progress",
        transition: {
          transitionId: startPlan.transitionId,
          transitionName: startPlan.transitionName
        },
        notes: [
          `The issue will move into active work via '${startPlan.transitionName}'.`
        ],
        manualStepRequired: false
      };
    }

    const selectPlan =
      semanticBefore === "todo" || semanticBefore === "backlog"
        ? await this.tryPlan(() =>
            this.assistantService.planSelectIssueForWork(
              issueKey,
              preferredTransitionName
            )
          )
        : undefined;

    if (selectPlan) {
      return {
        issueKey,
        ...(summary ? { summary } : {}),
        ...(statusBefore ? { statusBefore } : {}),
        semanticBefore,
        targetState: "selected-fallback",
        transition: {
          transitionId: selectPlan.transitionId,
          transitionName: selectPlan.transitionName
        },
        notes: [
          "No direct start-work transition could be resolved from the current state.",
          `The issue can still be moved out of backlog/To Do via '${selectPlan.transitionName}', but the workflow should be reviewed if active work still lacks an in-progress path.`
        ],
        manualStepRequired: true
      };
    }

    throw new Error(
      `Issue ${issueKey} is not in an active state and no safe transition to start work could be resolved. Manual Jira workflow intervention may be required.`
    );
  }

  async syncIssueProgress(input: {
    issueKey: string;
    progressComment: string;
    preferredTransitionName?: string;
    timeSpentSeconds?: number;
    started?: string;
  }): Promise<IssueProgressSyncResult> {
    const plan = await this.planIssueProgressSync(
      input.issueKey,
      input.preferredTransitionName
    );

    if (plan.transition) {
      await this.jiraApi.transitionIssue({
        issueKey: input.issueKey,
        transitionId: plan.transition.transitionId,
        comment: input.progressComment
      });
    } else {
      await this.jiraApi.addComment({
        issueKey: input.issueKey,
        comment: input.progressComment
      });
    }

    let worklogAdded = false;

    if (input.timeSpentSeconds) {
      await this.jiraApi.addWorklog({
        issueKey: input.issueKey,
        timeSpentSeconds: input.timeSpentSeconds,
        ...(input.started ? { started: input.started } : {}),
        comment: input.progressComment
      });
      worklogAdded = true;
    }

    const finalIssue = await this.loadIssue(input.issueKey);
    const statusAfter = finalIssue.fields?.status?.name;
    const semanticAfter = inferWorkflowSemantic({
      statusName: finalIssue.fields?.status?.name,
      statusCategoryKey: finalIssue.fields?.status?.statusCategory?.key
    });

    return {
      ...plan,
      ...(statusAfter ? { statusAfter } : {}),
      semanticAfter,
      progressCommentAdded: true,
      worklogAdded
    };
  }

  private async loadIssue(issueKey: string): Promise<ProgressIssue> {
    return (await this.jiraApi.getIssue(issueKey, [
      "summary",
      "status"
    ])) as ProgressIssue;
  }

  private async tryPlan(
    buildPlan: () => Promise<TransitionPlan>
  ): Promise<TransitionPlan | undefined> {
    try {
      return await buildPlan();
    } catch {
      return undefined;
    }
  }
}
