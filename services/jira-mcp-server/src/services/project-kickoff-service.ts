import type { AppConfig } from "../config.js";
import { buildIssueDescriptionWithExecutionMetadata } from "../domain/issue-execution-metadata.js";
import {
  buildCodexJiraAssistantKickoffTemplate,
  type KickoffItemBlueprint,
  type KickoffTemplate
} from "../domain/project-kickoff-blueprints.js";
import { isDoneIssue, type JiraIssueForSelection } from "../policy/assistant-policy.js";
import type { JiraApi } from "./jira-api.js";
import type { JiraAssistantService } from "./jira-assistant-service.js";
import type { QualityControlService } from "./quality-control-service.js";

type ExistingIssue = {
  key: string;
  fields?: {
    summary?: string;
    issuelinks?: Array<{
      type?: {
        name?: string;
        inward?: string;
        outward?: string;
      };
      inwardIssue?: LinkedIssue;
      outwardIssue?: LinkedIssue;
    }>;
  };
};

type LinkedIssue = {
  key?: string;
  fields?: {
    summary?: string;
    labels?: string[];
  };
};

type SeedQualityCompanionResult = {
  created: Record<string, string>;
  reused: Record<string, string>;
  skipped: Array<{
    issueKey: string;
    reason: string;
  }>;
};

export type SeedKickoffResult = {
  template: string;
  projectKey: string;
  created: string[];
  reused: string[];
  started?: string;
  completed: string[];
  issueKeysByBlueprintId: Record<string, string>;
  qualityCompanions?: SeedQualityCompanionResult;
};

export class ProjectKickoffService {
  constructor(
    private readonly jiraApi: JiraApi,
    private readonly assistantService: JiraAssistantService,
    private readonly config: AppConfig,
    private readonly qualityControlService?: QualityControlService
  ) {}

  buildDefaultTemplate(): KickoffTemplate {
    return buildCodexJiraAssistantKickoffTemplate();
  }

  async seedDefaultTemplate(input?: {
    projectKey?: string;
    startFirstIssue?: boolean;
    assigneeAccountId?: string;
    generateTestPlans?: boolean;
  }): Promise<SeedKickoffResult> {
    const template = this.buildDefaultTemplate();
    const projectKey = input?.projectKey ?? this.config.defaultProjectKey;

    if (!projectKey) {
      throw new Error(
        "Missing projectKey and no JIRA_DEFAULT_PROJECT_KEY is configured."
      );
    }

    const existingIssues = await this.searchExistingTemplateIssues(
      projectKey,
      template
    );
    const bySummary = new Map(
      existingIssues.map((issue) => [issue.fields?.summary ?? "", issue])
    );
    const issueKeysByBlueprintId: Record<string, string> = {};
    const created: string[] = [];
    const reused: string[] = [];
    const completed: string[] = [];

    for (const item of template.items) {
      const existing = bySummary.get(item.summary);

      if (existing?.key) {
        issueKeysByBlueprintId[item.id] = existing.key;
        reused.push(existing.key);
        continue;
      }

      const payload: {
        projectKey: string;
        issueType: KickoffItemBlueprint["issueType"];
        summary: string;
        description: string;
        labels: string[];
        assigneeAccountId?: string;
        parentIssueKey?: string;
        fields?: Record<string, unknown>;
      } = {
        projectKey,
        issueType: item.issueType,
        summary: item.summary,
        description:
          buildIssueDescriptionWithExecutionMetadata(
            item.description,
            item.executionMetadata
          ) ?? item.description,
        labels: [...template.labels, ...(item.labels ?? [])]
      };

      if (input?.assigneeAccountId) {
        payload.assigneeAccountId = input.assigneeAccountId;
      }

      const parentIssueKey = item.parentId
        ? issueKeysByBlueprintId[item.parentId]
        : undefined;

      if (parentIssueKey) {
        payload.parentIssueKey = parentIssueKey;
      }

      const extraFields = buildKickoffIssueFields(item);

      if (extraFields) {
        payload.fields = extraFields;
      }

      const issue = await this.jiraApi.createIssue(payload);

      issueKeysByBlueprintId[item.id] = issue.key;
      created.push(issue.key);
    }

    for (const dependency of template.dependencies) {
      const sourceKey = issueKeysByBlueprintId[dependency.blocks];
      const targetKey = issueKeysByBlueprintId[dependency.blockedBy];

      if (!sourceKey || !targetKey) {
        continue;
      }

      if (await this.hasBlocksLink(sourceKey, targetKey)) {
        continue;
      }

      await this.jiraApi.linkIssues({
        typeName: "Blocks",
        inwardIssueKey: targetKey,
        outwardIssueKey: sourceKey,
        comment: "Codex kickoff dependency"
      });
    }

    const qualityCompanions =
      input?.generateTestPlans === false
        ? undefined
        : await this.createQualityCompanions(template, issueKeysByBlueprintId);

    for (const item of template.items.filter((candidate) => candidate.marksDone)) {
      const issueKey = issueKeysByBlueprintId[item.id];

      if (!issueKey) {
        continue;
      }

      await this.moveIssueToDone(issueKey);
      completed.push(issueKey);
    }

    let started: string | undefined;

    if (input?.startFirstIssue !== false) {
      const firstItem = template.items.find((candidate) => candidate.startWork);

      if (firstItem) {
        const issueKey = issueKeysByBlueprintId[firstItem.id];

        if (issueKey) {
          const issue = await this.loadLifecycleIssue(issueKey);

          if (issue.fields?.status?.name === "In Progress") {
            started = issueKey;
          } else if (!isDoneIssue(issue)) {
            const plan = await this.assistantService.planStartIssueWork(issueKey);
            await this.jiraApi.transitionIssue({
              issueKey,
              transitionId: plan.transitionId,
              comment: "Codex kickoff: first work item started automatically."
            });
            started = issueKey;
          }
        }
      }
    }

    const result: SeedKickoffResult = {
      template: template.key,
      projectKey,
      created,
      reused,
      completed,
      issueKeysByBlueprintId
    };

    if (qualityCompanions) {
      result.qualityCompanions = qualityCompanions;
    }

    if (started) {
      result.started = started;
    }

    return result;
  }

  private async createQualityCompanions(
    template: KickoffTemplate,
    issueKeysByBlueprintId: Record<string, string>
  ): Promise<SeedQualityCompanionResult> {
    const result: SeedQualityCompanionResult = {
      created: {},
      reused: {},
      skipped: []
    };

    if (!this.qualityControlService) {
      for (const item of template.items.filter(isQualityCompanionCandidate)) {
        const issueKey = issueKeysByBlueprintId[item.id];

        if (issueKey) {
          result.skipped.push({
            issueKey,
            reason: "quality-control service is not configured"
          });
        }
      }

      return result;
    }

    for (const item of template.items.filter(isQualityCompanionCandidate)) {
      const issueKey = issueKeysByBlueprintId[item.id];

      if (!issueKey) {
        continue;
      }

      const existingTestPlan = await this.findLinkedTestPlanIssue(issueKey);

      if (existingTestPlan) {
        result.reused[issueKey] = existingTestPlan;
        continue;
      }

      try {
        const testPlan = await this.qualityControlService.createValidationWork(
          issueKey
        );
        result.created[issueKey] = testPlan.createdIssue.key;
      } catch (error) {
        result.skipped.push({
          issueKey,
          reason: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return result;
  }

  private async findLinkedTestPlanIssue(
    issueKey: string
  ): Promise<string | undefined> {
    const issue = (await this.jiraApi.getIssue(issueKey, [
      "summary",
      "issuelinks"
    ])) as ExistingIssue;
    const links = issue.fields?.issuelinks ?? [];

    for (const link of links) {
      const linkedIssue = link.inwardIssue ?? link.outwardIssue;

      if (!linkedIssue?.key) {
        continue;
      }

      const summary = linkedIssue.fields?.summary?.toLowerCase() ?? "";
      const labels = linkedIssue.fields?.labels ?? [];

      if (
        summary.startsWith(`[test plan] ${issueKey.toLowerCase()}`) ||
        labels.some((label) => label.toLowerCase() === "pre-dev-test-plan")
      ) {
        return linkedIssue.key;
      }
    }

    return undefined;
  }

  private async searchExistingTemplateIssues(
    projectKey: string,
    template: KickoffTemplate
  ): Promise<ExistingIssue[]> {
    const label = template.labels[template.labels.length - 1];
    const search = await this.jiraApi.searchIssues({
      jql: `project = ${projectKey} AND labels = "${label}" ORDER BY created ASC`,
      maxResults: 100,
      fields: ["summary", "issuelinks"]
    });

    return search.issues as ExistingIssue[];
  }

  private async hasBlocksLink(
    sourceIssueKey: string,
    targetIssueKey: string
  ): Promise<boolean> {
    const issue = (await this.jiraApi.getIssue(sourceIssueKey, [
      "summary",
      "issuelinks"
    ])) as ExistingIssue;
    const links = issue.fields?.issuelinks ?? [];

    return links.some((link) => {
      const target = link.outwardIssue?.key ?? link.inwardIssue?.key;

      if (target !== targetIssueKey) {
        return false;
      }

      return link.type?.name === "Blocks";
    });
  }

  private async moveIssueToDone(issueKey: string): Promise<void> {
    const issue = await this.loadLifecycleIssue(issueKey);

    if (isDoneIssue(issue)) {
      return;
    }

    const plan = await this.assistantService.planCloseIssueIfReady(issueKey);

    await this.jiraApi.transitionIssue({
      issueKey,
      transitionId: plan.transitionId,
      comment: "Codex kickoff: baseline work already completed."
    });
  }

  private async loadLifecycleIssue(
    issueKey: string
  ): Promise<JiraIssueForSelection> {
    return (await this.jiraApi.getIssue(issueKey, [
      "summary",
      "status",
      "priority",
      "issuelinks"
    ])) as JiraIssueForSelection;
  }
}

function isQualityCompanionCandidate(item: KickoffItemBlueprint): boolean {
  return (
    item.issueType !== "Epic" &&
    item.executionMetadata?.executionMode === "implement" &&
    item.marksDone !== true
  );
}

function buildKickoffIssueFields(
  item: KickoffItemBlueprint
): Record<string, unknown> | undefined {
  if (item.issueType === "Epic") {
    return undefined;
  }

  return {
    customfield_10103: extractAcceptanceCriteriaText(item.description)
  };
}

function extractAcceptanceCriteriaText(description: string): string {
  const marker = "Acceptance criteria:";
  const markerIndex = description.indexOf(marker);

  if (markerIndex === -1) {
    return description;
  }

  const criteria = description
    .slice(markerIndex + marker.length)
    .trim();

  return criteria || description;
}
