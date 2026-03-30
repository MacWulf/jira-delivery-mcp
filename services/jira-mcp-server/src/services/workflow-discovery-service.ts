import {
  inferWorkflowSemantic,
  type WorkflowSemantic
} from "../policy/workflow-semantics.js";
import type {
  JiraApi,
  JiraProjectStatusesResponse
} from "./jira-api.js";

type SampleIssue = {
  key?: string;
  fields?: {
    summary?: string;
    status?: {
      name?: string;
      statusCategory?: {
        key?: string;
      };
    };
    issuetype?: {
      id?: string;
      name?: string;
      subtask?: boolean;
    };
  };
};

export type WorkflowDiscoverySnapshot = {
  project: {
    key?: string;
    name?: string;
    id?: string;
    projectTypeKey?: string;
    simplified?: boolean;
    style?: string;
  };
  managementModel: "team-managed" | "company-managed";
  issueTypesObserved: Array<{
    issueTypeId?: string;
    issueTypeName: string;
    subtask: boolean;
    statusCount: number;
    sampleIssueKeys: string[];
  }>;
  statusesObserved: Array<{
    issueTypeName: string;
    statusId?: string;
    statusName: string;
    statusCategoryKey?: string;
    semantic: WorkflowSemantic;
    description?: string;
  }>;
  transitionsObserved: Array<{
    issueTypeName: string;
    issueKey: string;
    currentStatusName?: string;
    currentSemantic: WorkflowSemantic;
    transitions: Array<{
      transitionId: string;
      transitionName: string;
      toStatusName?: string;
      toStatusCategoryKey?: string;
      toSemantic: WorkflowSemantic;
    }>;
  }>;
  transitionPolicyHints: {
    selectedTransitionNames: string[];
    inProgressTransitionNames: string[];
    reviewTransitionNames: string[];
    qaTransitionNames: string[];
    blockedTransitionNames: string[];
    doneTransitionNames: string[];
  };
  notes: string[];
};

export class WorkflowDiscoveryService {
  constructor(private readonly jiraApi: JiraApi) {}

  async discoverProjectWorkflow(
    projectKey: string
  ): Promise<WorkflowDiscoverySnapshot> {
    const project = await this.jiraApi.getProject(projectKey);
    const projectStatuses = await this.jiraApi.getProjectStatuses(projectKey);
    const search = await this.jiraApi.searchIssues({
      jql: `project = "${escapeJqlString(projectKey)}" ORDER BY updated DESC`,
      maxResults: 50,
      fields: ["summary", "status", "issuetype"]
    });

    const sampleIssues = search.issues as SampleIssue[];
    const sampleIssueKeysByType = buildSampleIssueKeysByType(sampleIssues);
    const transitionsObserved = await this.collectTransitionSamples(
      sampleIssues,
      sampleIssueKeysByType
    );
    const managementModel =
      project.simplified === true ? "team-managed" : "company-managed";
    const notes: string[] = [];

    if (managementModel === "team-managed") {
      notes.push(
        "This project is team-managed or simplified. Discovery uses project-local statuses and sampled issue transitions instead of assuming classic scheme data."
      );
    }

    notes.push(
      "Transition discovery is sample-based. Rare or currently unused issue types may need additional representative issues before policy automation relies on the snapshot."
    );

    if (transitionsObserved.length === 0) {
      notes.push(
        "No live transition samples were collected. Policy hints may stay incomplete until more issue types have representative issues."
      );
    }

    return {
      project: {
        ...(project.key ? { key: project.key } : {}),
        ...(project.name ? { name: project.name } : {}),
        ...(project.id ? { id: project.id } : {}),
        ...(project.projectTypeKey
          ? { projectTypeKey: project.projectTypeKey }
          : {}),
        ...(project.simplified !== undefined
          ? { simplified: project.simplified }
          : {}),
        ...(project.style ? { style: project.style } : {})
      },
      managementModel,
      issueTypesObserved: buildIssueTypesObserved(
        projectStatuses,
        sampleIssueKeysByType
      ),
      statusesObserved: buildStatusesObserved(projectStatuses),
      transitionsObserved,
      transitionPolicyHints: buildTransitionPolicyHints(transitionsObserved),
      notes
    };
  }

  private async collectTransitionSamples(
    sampleIssues: SampleIssue[],
    sampleIssueKeysByType: Map<string, string[]>
  ): Promise<WorkflowDiscoverySnapshot["transitionsObserved"]> {
    const issueByKey = new Map(
      sampleIssues
        .filter((issue) => issue.key)
        .map((issue) => [issue.key as string, issue])
    );
    const samples: WorkflowDiscoverySnapshot["transitionsObserved"] = [];

    for (const [issueTypeName, issueKeys] of sampleIssueKeysByType) {
      const issueTypeSamples = await Promise.all(
        issueKeys.map(async (issueKey) => {
          const issue = issueByKey.get(issueKey);
          const currentStatusName = issue?.fields?.status?.name;
          const currentSemantic = inferWorkflowSemantic({
            statusName: currentStatusName,
            statusCategoryKey: issue?.fields?.status?.statusCategory?.key
          });
          const transitions = await this.jiraApi.getTransitions(issueKey);

          return {
            issueTypeName,
            issueKey,
            ...(currentStatusName ? { currentStatusName } : {}),
            currentSemantic,
            transitions: transitions.transitions.map((transition) => ({
              transitionId: transition.id,
              transitionName: transition.name,
              ...(transition.to?.name ? { toStatusName: transition.to.name } : {}),
              ...(transition.to?.statusCategory?.key
                ? { toStatusCategoryKey: transition.to.statusCategory.key }
                : {}),
              toSemantic: inferWorkflowSemantic({
                statusName: transition.to?.name,
                statusCategoryKey: transition.to?.statusCategory?.key
              })
            }))
          };
        })
      );

      samples.push(...issueTypeSamples);
    }

    return samples;
  }
}

function buildIssueTypesObserved(
  projectStatuses: JiraProjectStatusesResponse,
  sampleIssueKeysByType: Map<string, string[]>
): WorkflowDiscoverySnapshot["issueTypesObserved"] {
  return projectStatuses.map((issueType) => ({
    ...(issueType.id ? { issueTypeId: issueType.id } : {}),
    issueTypeName: issueType.name ?? "Unknown",
    subtask: issueType.subtask === true,
    statusCount: issueType.statuses?.length ?? 0,
    sampleIssueKeys: sampleIssueKeysByType.get(issueType.name ?? "Unknown") ?? []
  }));
}

function buildStatusesObserved(
  projectStatuses: JiraProjectStatusesResponse
): WorkflowDiscoverySnapshot["statusesObserved"] {
  return projectStatuses.flatMap((issueType) =>
    (issueType.statuses ?? []).map((status) => ({
      issueTypeName: issueType.name ?? "Unknown",
      ...(status.id ? { statusId: status.id } : {}),
      statusName: status.name ?? "Unknown",
      ...(status.statusCategory?.key
        ? { statusCategoryKey: status.statusCategory.key }
        : {}),
      semantic: inferWorkflowSemantic({
        statusName: status.name,
        statusCategoryKey: status.statusCategory?.key
      }),
      ...(status.description ? { description: status.description } : {})
    }))
  );
}

function buildTransitionPolicyHints(
  transitionsObserved: WorkflowDiscoverySnapshot["transitionsObserved"]
): WorkflowDiscoverySnapshot["transitionPolicyHints"] {
  const inProgress = new Set<string>();
  const selected = new Set<string>();
  const review = new Set<string>();
  const qa = new Set<string>();
  const blocked = new Set<string>();
  const done = new Set<string>();

  for (const sample of transitionsObserved) {
    for (const transition of sample.transitions) {
      if (transition.toSemantic === "ready") {
        selected.add(transition.transitionName);
      }

      if (transition.toSemantic === "in_progress") {
        inProgress.add(transition.transitionName);
      }

      if (transition.toSemantic === "review") {
        review.add(transition.transitionName);
      }

      if (transition.toSemantic === "qa") {
        qa.add(transition.transitionName);
      }

      if (transition.toSemantic === "blocked") {
        blocked.add(transition.transitionName);
      }

      if (transition.toSemantic === "done" || transition.toSemantic === "canceled") {
        done.add(transition.transitionName);
      }
    }
  }

  return {
    selectedTransitionNames: [...selected],
    inProgressTransitionNames: [...inProgress],
    reviewTransitionNames: [...review],
    qaTransitionNames: [...qa],
    blockedTransitionNames: [...blocked],
    doneTransitionNames: [...done]
  };
}

function buildSampleIssueKeysByType(sampleIssues: SampleIssue[]): Map<string, string[]> {
  const keysByType = new Map<string, Map<string, string>>();

  for (const issue of sampleIssues) {
    const issueKey = issue.key;
    const issueTypeName = issue.fields?.issuetype?.name;
    const statusName = issue.fields?.status?.name ?? "Unknown";

    if (!issueKey || !issueTypeName) {
      continue;
    }

    let byStatus = keysByType.get(issueTypeName);

    if (!byStatus) {
      byStatus = new Map<string, string>();
      keysByType.set(issueTypeName, byStatus);
    }

    if (!byStatus.has(statusName) && byStatus.size < 3) {
      byStatus.set(statusName, issueKey);
    }
  }

  return new Map(
    [...keysByType.entries()].map(([issueTypeName, byStatus]) => [
      issueTypeName,
      [...byStatus.values()]
    ])
  );
}

function escapeJqlString(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("\"", "\\\"");
}
