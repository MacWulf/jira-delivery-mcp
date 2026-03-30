import type { JiraIssueForSelection } from "./assistant-policy.js";

export type IssueDependencyReference = {
  issueKey: string;
  summary?: string;
  statusName?: string;
  statusCategoryKey?: string;
  linkTypeName?: string;
};

export type IssueBlockEdge = {
  sourceIssueKey: string;
  targetIssueKey: string;
  sourceSummary?: string;
  targetSummary?: string;
  sourceStatusName?: string;
  targetStatusName?: string;
  linkTypeName?: string;
};

export type IssueDependencySnapshot = {
  blockedBy: IssueDependencyReference[];
  openBlockedBy: IssueDependencyReference[];
  blocks: IssueDependencyReference[];
  openBlocks: IssueDependencyReference[];
  related: IssueDependencyReference[];
  hasOpenBlockingDependencies: boolean;
  blocksOpenWork: boolean;
};

export function buildIssueDependencySnapshot(
  issue: JiraIssueForSelection
): IssueDependencySnapshot {
  const blockedBy: IssueDependencyReference[] = [];
  const blocks: IssueDependencyReference[] = [];
  const related: IssueDependencyReference[] = [];

  for (const link of issue.fields?.issuelinks ?? []) {
    const linkTypeName = link.type?.name;

    if (
      looksLikeBlockedBy(link.type?.inward) &&
      link.outwardIssue?.key
    ) {
      blockedBy.push(
        buildIssueDependencyReference(link.outwardIssue, linkTypeName)
      );
      continue;
    }

    if (
      looksLikeBlocks(link.type?.outward) &&
      link.inwardIssue?.key
    ) {
      blocks.push(buildIssueDependencyReference(link.inwardIssue, linkTypeName));
      continue;
    }

    const relatedIssue = link.outwardIssue ?? link.inwardIssue;

    if (relatedIssue?.key) {
      related.push(buildIssueDependencyReference(relatedIssue, linkTypeName));
    }
  }

  const openBlockedBy = blockedBy.filter(
    (dependency) => dependency.statusCategoryKey !== "done"
  );
  const openBlocks = blocks.filter(
    (dependency) => dependency.statusCategoryKey !== "done"
  );

  return {
    blockedBy,
    openBlockedBy,
    blocks,
    openBlocks,
    related,
    hasOpenBlockingDependencies: openBlockedBy.length > 0,
    blocksOpenWork: openBlocks.length > 0
  };
}

export function extractIssueBlockEdges(
  issue: JiraIssueForSelection
): IssueBlockEdge[] {
  const issueKey = issue.key;

  if (!issueKey) {
    return [];
  }

  const edges: IssueBlockEdge[] = [];

  for (const link of issue.fields?.issuelinks ?? []) {
    const linkTypeName = link.type?.name;

    if (looksLikeBlockedBy(link.type?.inward) && link.outwardIssue?.key) {
      edges.push({
        sourceIssueKey: link.outwardIssue.key,
        targetIssueKey: issueKey,
        ...(link.outwardIssue.fields?.summary
          ? { sourceSummary: link.outwardIssue.fields.summary }
          : {}),
        ...(issue.fields?.summary ? { targetSummary: issue.fields.summary } : {}),
        ...(link.outwardIssue.fields?.status?.name
          ? { sourceStatusName: link.outwardIssue.fields.status.name }
          : {}),
        ...(issue.fields?.status?.name ? { targetStatusName: issue.fields.status.name } : {}),
        ...(linkTypeName ? { linkTypeName } : {})
      });
      continue;
    }

    if (looksLikeBlocks(link.type?.outward) && link.inwardIssue?.key) {
      edges.push({
        sourceIssueKey: issueKey,
        targetIssueKey: link.inwardIssue.key,
        ...(issue.fields?.summary ? { sourceSummary: issue.fields.summary } : {}),
        ...(link.inwardIssue.fields?.summary
          ? { targetSummary: link.inwardIssue.fields.summary }
          : {}),
        ...(issue.fields?.status?.name ? { sourceStatusName: issue.fields.status.name } : {}),
        ...(link.inwardIssue.fields?.status?.name
          ? { targetStatusName: link.inwardIssue.fields.status.name }
          : {}),
        ...(linkTypeName ? { linkTypeName } : {})
      });
    }
  }

  return edges;
}

function buildIssueDependencyReference(
  issue: {
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
  },
  linkTypeName?: string
): IssueDependencyReference {
  return {
    issueKey: issue.key ?? "UNKNOWN",
    ...(issue.fields?.summary ? { summary: issue.fields.summary } : {}),
    ...(issue.fields?.status?.name
      ? { statusName: issue.fields.status.name }
      : {}),
    ...(issue.fields?.status?.statusCategory?.key
      ? { statusCategoryKey: issue.fields.status.statusCategory.key }
      : {}),
    ...(linkTypeName ? { linkTypeName } : {})
  };
}

function looksLikeBlockedBy(value?: string): boolean {
  return normalize(value).includes("blocked by");
}

function looksLikeBlocks(value?: string): boolean {
  return normalize(value).includes("blocks");
}

function normalize(value?: string): string {
  return (value ?? "").trim().toLowerCase();
}
