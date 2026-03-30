import { buildIssueDependencySnapshot } from "./dependency-policy.js";
import { inferWorkflowSemantic } from "./workflow-semantics.js";

export type JiraIssueForSelection = {
  key?: string;
  fields?: {
    summary?: string;
    status?: {
      name?: string;
      statusCategory?: {
        key?: string;
      };
    };
    priority?: {
      name?: string;
    };
    labels?: string[];
    issuetype?: {
      name?: string;
    };
    parent?: {
      key?: string;
    };
    description?: unknown;
    issuelinks?: Array<{
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

export type JiraTransition = {
  id: string;
  name: string;
  to?: {
    id?: string;
    name?: string;
    statusCategory?: {
      key?: string;
      name?: string;
    };
  };
};

const PRIORITY_ORDER: Record<string, number> = {
  Highest: 5,
  High: 4,
  Medium: 3,
  Low: 2,
  Lowest: 1
};

export function isDoneIssue(issue: JiraIssueForSelection): boolean {
  const semantic = inferWorkflowSemantic({
    statusName: issue.fields?.status?.name,
    statusCategoryKey: issue.fields?.status?.statusCategory?.key
  });

  return semantic === "done" || semantic === "canceled";
}

export function isWorkflowBlockedIssue(
  issue: JiraIssueForSelection
): boolean {
  return (
    inferWorkflowSemantic({
      statusName: issue.fields?.status?.name,
      statusCategoryKey: issue.fields?.status?.statusCategory?.key
    }) === "blocked"
  );
}

export function hasOpenBlockingDependency(
  issue: JiraIssueForSelection
): boolean {
  return buildIssueDependencySnapshot(issue).hasOpenBlockingDependencies;
}

export function compareIssuesByPriority(
  left: JiraIssueForSelection,
  right: JiraIssueForSelection
): number {
  const leftPriority =
    PRIORITY_ORDER[left.fields?.priority?.name ?? "Medium"] ?? 0;
  const rightPriority =
    PRIORITY_ORDER[right.fields?.priority?.name ?? "Medium"] ?? 0;

  return rightPriority - leftPriority;
}

export function buildIssueSelectionReason(issue: JiraIssueForSelection): string {
  const status = issue.fields?.status?.name ?? "Unknown";
  const semantic = inferWorkflowSemantic({
    statusName: issue.fields?.status?.name,
    statusCategoryKey: issue.fields?.status?.statusCategory?.key
  });
  const priority = issue.fields?.priority?.name ?? "Unknown";
  const dependencySnapshot = buildIssueDependencySnapshot(issue);
  const blockers = dependencySnapshot.openBlockedBy.length;
  const downstreamOpenBlocks = dependencySnapshot.openBlocks.length;

  return `Highest currently eligible priority. Status=${status}, Semantic=${semantic}, Priority=${priority}, OpenBlockerCount=${blockers}, DownstreamOpenBlockCount=${downstreamOpenBlocks}`;
}

export function findTransitionByName(
  transitions: JiraTransition[],
  name: string
): JiraTransition | undefined {
  const normalizedName = normalize(name);

  return transitions.find(
    (transition) => normalize(transition.name) === normalizedName
  );
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}
