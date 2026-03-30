import {
  compareIssuesByPriority,
  type JiraIssueForSelection
} from "./assistant-policy.js";
import { inferWorkflowSemantic } from "./workflow-semantics.js";

export type IssueExecutionOrdering = {
  statusBucket:
    | "in_progress"
    | "qa"
    | "review"
    | "selected"
    | "todo"
    | "blocked"
    | "other";
  roadmap: boolean;
  leafWork: boolean;
  issueTypeName?: string;
};

export function compareIssuesForExecution(
  left: JiraIssueForSelection,
  right: JiraIssueForSelection
): number {
  const leftScore = scoreIssueForExecution(left);
  const rightScore = scoreIssueForExecution(right);

  if (leftScore !== rightScore) {
    return rightScore - leftScore;
  }

  const priorityComparison = compareIssuesByPriority(left, right);

  if (priorityComparison !== 0) {
    return priorityComparison;
  }

  return (left.key ?? "").localeCompare(right.key ?? "");
}

export function buildExecutionOrdering(
  issue: JiraIssueForSelection
): IssueExecutionOrdering {
  const labels = issue.fields?.labels ?? [];
  const issueTypeName = issue.fields?.issuetype?.name;
  const semantic = inferWorkflowSemantic({
    statusName: issue.fields?.status?.name,
    statusCategoryKey: issue.fields?.status?.statusCategory?.key
  });

  return {
    statusBucket: mapSemanticToExecutionBucket(semantic),
    roadmap: labels.includes("capability-roadmap"),
    leafWork: Boolean(issue.fields?.parent?.key),
    ...(issueTypeName ? { issueTypeName } : {})
  };
}

export function buildExecutionOrderingReason(
  issue: JiraIssueForSelection
): string {
  const ordering = buildExecutionOrdering(issue);

  return `Execution ordering: StatusBucket=${ordering.statusBucket}, CapabilityRoadmap=${ordering.roadmap}, LeafWork=${ordering.leafWork}, IssueType=${ordering.issueTypeName ?? "Unknown"}`;
}

function scoreIssueForExecution(issue: JiraIssueForSelection): number {
  const ordering = buildExecutionOrdering(issue);
  let score = 0;

  switch (ordering.statusBucket) {
    case "in_progress":
      score += 1000;
      break;
    case "qa":
      score += 900;
      break;
    case "review":
      score += 820;
      break;
    case "selected":
      score += 760;
      break;
    case "todo":
      score += 700;
      break;
    case "blocked":
      score -= 1000;
      break;
    default:
      break;
  }

  if (ordering.roadmap) {
    score += 120;
  }

  if (ordering.leafWork) {
    score += 40;
  }

  if (ordering.issueTypeName === "Epic") {
    score -= 40;
  }

  return score;
}

function mapSemanticToExecutionBucket(
  semantic: ReturnType<typeof inferWorkflowSemantic>
): IssueExecutionOrdering["statusBucket"] {
  switch (semantic) {
    case "in_progress":
      return "in_progress";
    case "qa":
      return "qa";
    case "review":
      return "review";
    case "ready":
      return "selected";
    case "todo":
    case "backlog":
      return "todo";
    case "blocked":
      return "blocked";
    default:
      return "other";
  }
}
