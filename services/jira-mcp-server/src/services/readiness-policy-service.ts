import type { JiraIssueForSelection } from "../policy/assistant-policy.js";
import {
  evaluateIssueReadiness,
  type IssueReadinessEvaluation,
  type IssueReadinessStage
} from "../policy/readiness-policy.js";
import type { JiraApi } from "./jira-api.js";

const DEFAULT_FIELDS = [
  "summary",
  "description",
  "status",
  "priority",
  "labels",
  "issuetype",
  "parent",
  "issuelinks"
];

export class ReadinessPolicyService {
  constructor(private readonly jiraApi: JiraApi) {}

  async loadIssueForReadiness(issueKey: string): Promise<JiraIssueForSelection> {
    return (await this.jiraApi.getIssue(
      issueKey,
      DEFAULT_FIELDS
    )) as JiraIssueForSelection;
  }

  async evaluateIssue(
    issueKey: string,
    stage: IssueReadinessStage
  ): Promise<IssueReadinessEvaluation> {
    const issue = await this.loadIssueForReadiness(issueKey);
    const availableTransitions =
      stage === "close"
        ? (await this.jiraApi.getTransitions(issueKey)).transitions
        : undefined;

    return evaluateIssueReadiness(
      issue,
      stage,
      availableTransitions ? { availableTransitions } : undefined
    );
  }
}
