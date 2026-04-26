import type { JiraIssueForSelection } from "./assistant-policy.js";
import {
  buildIssueDependencySnapshot,
  type IssueDependencyReference
} from "./dependency-policy.js";
import { inferWorkflowSemantic } from "./workflow-semantics.js";

export type DependencyImpactSummary = {
  currentSemantic: ReturnType<typeof inferWorkflowSemantic>;
  openBlockerCount: number;
  downstreamOpenBlockCount: number;
  activeDownstreamOpenBlockCount: number;
  openBlockers: IssueDependencyReference[];
  downstreamOpenBlocks: IssueDependencyReference[];
  upstreamGate: boolean;
  recommendedStatusSemantic?: "todo" | "in_progress";
  narrative: string[];
};

export function buildDependencyImpactSummary(
  issue: JiraIssueForSelection
): DependencyImpactSummary {
  const snapshot = buildIssueDependencySnapshot(issue);
  const currentSemantic = inferWorkflowSemantic({
    statusName: issue.fields?.status?.name,
    statusCategoryKey: issue.fields?.status?.statusCategory?.key
  });
  const narrative: string[] = [];
  let recommendedStatusSemantic: "todo" | "in_progress" | undefined;

  if (snapshot.openBlockedBy.length > 0) {
    narrative.push(`Blocked by ${formatIssueList(snapshot.openBlockedBy)}.`);
    recommendedStatusSemantic = "todo";
  }

  if (snapshot.openBlocks.length > 0) {
    narrative.push(
      `Unblocks ${snapshot.openBlocks.length} downstream item(s): ${formatIssueList(snapshot.openBlocks)}.`
    );

    if (snapshot.activeOpenBlocks.length > 0) {
      narrative.push(
        `Active downstream work is waiting on this issue: ${formatIssueList(snapshot.activeOpenBlocks)}.`
      );
    }

    if (!recommendedStatusSemantic && currentSemantic !== "done") {
      recommendedStatusSemantic = "in_progress";
    }
  }

  if (narrative.length === 0) {
    narrative.push("No active dependency pressure is currently visible.");
  }

  return {
    currentSemantic,
    openBlockerCount: snapshot.openBlockedBy.length,
    downstreamOpenBlockCount: snapshot.openBlocks.length,
    activeDownstreamOpenBlockCount: snapshot.activeOpenBlocks.length,
    openBlockers: snapshot.openBlockedBy,
    downstreamOpenBlocks: snapshot.openBlocks,
    upstreamGate:
      snapshot.blocksOpenWork && !snapshot.hasOpenBlockingDependencies,
    ...(recommendedStatusSemantic ? { recommendedStatusSemantic } : {}),
    narrative
  };
}

function formatIssueList(dependencies: IssueDependencyReference[]): string {
  const visible = dependencies.slice(0, 3).map((dependency) => dependency.issueKey);
  const suffix =
    dependencies.length > 3 ? ` +${dependencies.length - 3} more` : "";

  return `${visible.join(", ")}${suffix}`;
}
