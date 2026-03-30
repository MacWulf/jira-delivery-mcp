import type { AppConfig } from "../config.js";
import type { JiraApi } from "./jira-api.js";

type IssueForDependencyDrift = {
  key?: string;
  fields?: {
    summary?: string;
    status?: {
      name?: string;
      statusCategory?: {
        key?: string;
      };
    };
    labels?: string[];
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
          status?: {
            statusCategory?: {
              key?: string;
            };
          };
        };
      };
      outwardIssue?: {
        key?: string;
        fields?: {
          status?: {
            statusCategory?: {
              key?: string;
            };
          };
        };
      };
    }>;
  };
};

export type ExpectedDependencyInput = {
  sourceIssueKey: string;
  targetIssueKey: string;
  typeName?: string;
};

export type DependencyEdgeSummary = {
  linkId?: string;
  sourceIssueKey: string;
  targetIssueKey: string;
  typeName: string;
  sourceSummary?: string;
  targetSummary?: string;
  sourceStatusName?: string;
  targetStatusName?: string;
  staleReasons: string[];
};

export type DependencyDriftReport = {
  projectKey?: string;
  jql: string;
  issueCount: number;
  expectedDependencyCount: number;
  actualDependencyCount: number;
  blockedStatusConflicts: Array<{
    issueKey: string;
    summary?: string;
    statusName?: string;
    openBlockedBy: string[];
  }>;
  duplicateDependencies: Array<{
    signature: string;
    linkIds: string[];
    sourceIssueKey: string;
    targetIssueKey: string;
    typeName: string;
  }>;
  staleDependencies: DependencyEdgeSummary[];
  missingExpectedDependencies: Array<{
    sourceIssueKey: string;
    targetIssueKey: string;
    typeName: string;
  }>;
  unexpectedDependencies: DependencyEdgeSummary[];
  notes: string[];
};

export class DependencyDriftService {
  constructor(
    private readonly jiraApi: JiraApi,
    private readonly config: AppConfig
  ) {}

  async analyze(input?: {
    projectKey?: string;
    jql?: string;
    expectedDependencies?: ExpectedDependencyInput[];
  }): Promise<DependencyDriftReport> {
    const projectKey = input?.projectKey ?? this.config.defaultProjectKey;
    const jql =
      input?.jql ??
      (projectKey
        ? `project = "${escapeJqlString(projectKey)}" ORDER BY updated DESC`
        : undefined);

    if (!jql) {
      throw new Error(
        "Missing projectKey/jql and no JIRA_DEFAULT_PROJECT_KEY is configured."
      );
    }

    const search = await this.jiraApi.searchIssues({
      jql,
      maxResults: 100,
      fields: ["summary", "status", "labels", "issuelinks"]
    });
    const issues = search.issues as IssueForDependencyDrift[];
    const issueByKey = new Map(
      issues
        .filter((issue) => issue.key)
        .map((issue) => [issue.key as string, issue])
    );

    const actualEdges = buildActualDependencyEdges(issues, issueByKey);
    const blockedStatusConflicts = buildBlockedStatusConflicts(issues);
    const duplicateDependencies = buildDuplicateDependencies(actualEdges);
    const staleDependencies = actualEdges.filter(
      (edge) => edge.staleReasons.length > 0
    );

    const expectedDependencies = (input?.expectedDependencies ?? []).map(
      normalizeExpectedDependency
    );
    const expectedSignatures = new Set(
      expectedDependencies.map(buildExpectedSignature)
    );
    const actualSignatures = new Set(
      actualEdges.map((edge) => buildSignature(edge))
    );

    const missingExpectedDependencies = expectedDependencies.filter(
      (dependency) => !actualSignatures.has(buildExpectedSignature(dependency))
    );
    const unexpectedDependencies =
      expectedSignatures.size === 0
        ? []
        : actualEdges.filter(
            (edge) =>
              issueByKey.has(edge.sourceIssueKey) &&
              issueByKey.has(edge.targetIssueKey) &&
              !expectedSignatures.has(buildSignature(edge))
          );

    const notes: string[] = [];

    if (expectedSignatures.size === 0) {
      notes.push(
        "No expected dependency blueprint was supplied. Missing/unexpected drift checks are skipped, but duplicate and stale-link signals are still available."
      );
    }

    if (staleDependencies.length === 0) {
      notes.push(
        "No stale dependency candidates were detected with the current heuristics."
      );
    } else {
      notes.push(
        "Stale dependency candidates are heuristic signals. Review them before unlinking or relinking live Jira edges."
      );
    }

    return {
      ...(projectKey ? { projectKey } : {}),
      jql,
      issueCount: issues.length,
      expectedDependencyCount: expectedDependencies.length,
      actualDependencyCount: actualEdges.length,
      blockedStatusConflicts,
      duplicateDependencies,
      staleDependencies,
      missingExpectedDependencies,
      unexpectedDependencies,
      notes
    };
  }
}

function buildBlockedStatusConflicts(
  issues: IssueForDependencyDrift[]
): DependencyDriftReport["blockedStatusConflicts"] {
  return issues
    .filter((issue) => {
      const normalizedStatus = normalize(issue.fields?.status?.name);

      return normalizedStatus === "in progress" || normalizedStatus === "in review";
    })
    .flatMap((issue) => {
      const blockers = (issue.fields?.issuelinks ?? [])
        .filter(
          (link) =>
            normalize(link.type?.inward).includes("blocked by") &&
            link.outwardIssue?.key !== undefined &&
            normalize(link.outwardIssue?.fields?.status?.statusCategory?.key) !== "done"
        )
        .map((link) => link.outwardIssue?.key)
        .filter((key): key is string => Boolean(key));

      if (blockers.length === 0 || !issue.key) {
        return [];
      }

      return [
        {
          issueKey: issue.key,
          ...(issue.fields?.summary ? { summary: issue.fields.summary } : {}),
          ...(issue.fields?.status?.name ? { statusName: issue.fields.status.name } : {}),
          openBlockedBy: blockers
        }
      ];
    });
}

function buildActualDependencyEdges(
  issues: IssueForDependencyDrift[],
  issueByKey: Map<string, IssueForDependencyDrift>
): DependencyEdgeSummary[] {
  const edges: DependencyEdgeSummary[] = [];

  for (const issue of issues) {
    const sourceIssueKey = issue.key;

    if (!sourceIssueKey) {
      continue;
    }

    for (const link of issue.fields?.issuelinks ?? []) {
      if (!looksLikeBlocks(link.type?.outward) || !link.inwardIssue?.key) {
        continue;
      }

      const targetIssueKey = link.inwardIssue.key;
      const sourceIssue = issueByKey.get(sourceIssueKey);
      const targetIssue = issueByKey.get(targetIssueKey);
      const staleReasons = buildStaleReasons({
        ...(sourceIssue ? { sourceIssue } : {}),
        ...(targetIssue ? { targetIssue } : {})
      });

      edges.push({
        ...(link.id ? { linkId: link.id } : {}),
        sourceIssueKey,
        targetIssueKey,
        typeName: link.type?.name ?? "Blocks",
        ...(sourceIssue?.fields?.summary
          ? { sourceSummary: sourceIssue.fields.summary }
          : {}),
        ...(targetIssue?.fields?.summary
          ? { targetSummary: targetIssue.fields.summary }
          : {}),
        ...(sourceIssue?.fields?.status?.name
          ? { sourceStatusName: sourceIssue.fields.status.name }
          : {}),
        ...(targetIssue?.fields?.status?.name
          ? { targetStatusName: targetIssue.fields.status.name }
          : {}),
        staleReasons
      });
    }
  }

  return edges;
}

function buildDuplicateDependencies(
  edges: DependencyEdgeSummary[]
): DependencyDriftReport["duplicateDependencies"] {
  const bySignature = new Map<string, DependencyEdgeSummary[]>();

  for (const edge of edges) {
    const signature = buildSignature(edge);
    const existing = bySignature.get(signature) ?? [];
    existing.push(edge);
    bySignature.set(signature, existing);
  }

  return [...bySignature.entries()]
    .filter(([, matches]) => matches.length > 1)
    .flatMap(([signature, matches]) => {
      const first = matches[0];

      if (!first) {
        return [];
      }

      return [
        {
          signature,
          linkIds: matches.flatMap((edge) => (edge.linkId ? [edge.linkId] : [])),
          sourceIssueKey: first.sourceIssueKey,
          targetIssueKey: first.targetIssueKey,
          typeName: first.typeName
        }
      ];
    });
}

function buildStaleReasons(input: {
  sourceIssue?: IssueForDependencyDrift | undefined;
  targetIssue?: IssueForDependencyDrift | undefined;
}): string[] {
  const reasons: string[] = [];
  const sourceLabels = input.sourceIssue?.fields?.labels ?? [];
  const targetLabels = input.targetIssue?.fields?.labels ?? [];

  if (containsLifecycleLabel(sourceLabels, "superseded")) {
    reasons.push("source_issue_superseded");
  }

  if (containsLifecycleLabel(targetLabels, "superseded")) {
    reasons.push("target_issue_superseded");
  }

  if (containsLifecycleLabel(sourceLabels, "legacy-seed")) {
    reasons.push("source_issue_legacy_seed");
  }

  if (containsLifecycleLabel(targetLabels, "legacy-seed")) {
    reasons.push("target_issue_legacy_seed");
  }

  if (
    input.sourceIssue?.fields?.status?.statusCategory?.key === "done" &&
    input.targetIssue?.fields?.status?.statusCategory?.key === "done"
  ) {
    reasons.push("both_issues_done");
  }

  return reasons;
}

function containsLifecycleLabel(labels: string[], expected: string): boolean {
  return labels.some((label) => label.trim().toLowerCase() === expected);
}

function normalizeExpectedDependency(
  dependency: ExpectedDependencyInput
): Required<ExpectedDependencyInput> {
  return {
    sourceIssueKey: dependency.sourceIssueKey,
    targetIssueKey: dependency.targetIssueKey,
    typeName: dependency.typeName ?? "Blocks"
  };
}

function buildExpectedSignature(
  dependency: Required<ExpectedDependencyInput>
): string {
  return `${dependency.typeName}::${dependency.sourceIssueKey}::${dependency.targetIssueKey}`;
}

function buildSignature(edge: DependencyEdgeSummary): string {
  return `${edge.typeName}::${edge.sourceIssueKey}::${edge.targetIssueKey}`;
}

function looksLikeBlocks(value?: string): boolean {
  return normalize(value).includes("blocks");
}

function normalize(value?: string): string {
  return (value ?? "").trim().toLowerCase();
}

function escapeJqlString(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("\"", "\\\"");
}
