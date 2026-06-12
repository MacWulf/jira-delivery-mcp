import {
  buildArchitectDecisionPageTitle,
  type ArchitectDecisionRecordInput
} from "./architect-decision-record.js";
import type { ArchitectIssueMetadataInput } from "./issue-architecture-metadata.js";

export type ArchitectAdrCandidatePage = {
  id: string;
  title: string;
  labels: string[];
  bodyStorage?: string;
  webUrl?: string;
};

export type ArchitectDecisionConflictType =
  | "same-title"
  | "affected-issue-overlap"
  | "active-decision-overlap";

export type ArchitectDecisionConflict = {
  type: ArchitectDecisionConflictType;
  severity: "advisory" | "blocking";
  pageId: string;
  title: string;
  status?: string;
  webUrl?: string;
  reason: string;
  affectedIssueKeys: string[];
};

export type ArchitectDecisionSafetyAction =
  | "create-new-adr"
  | "update-existing-adr"
  | "supersede-existing-adr"
  | "manual-review";

export type ArchitectDecisionSafetyPlan = {
  adrTitle: string;
  existingAdrCount: number;
  conflicts: ArchitectDecisionConflict[];
  recommendedAction: ArchitectDecisionSafetyAction;
  blockingPlan: {
    shouldBlock: boolean;
    reason?: string;
    affectedIssues: Array<{
      issueKey: string;
      architectureMetadata: ArchitectIssueMetadataInput;
    }>;
  };
  boundedSpikePlan?: {
    required: boolean;
    reason: string;
    createIssuePayload: {
      issueType: "Task";
      summary: string;
      description: string;
      labels: string[];
      architectureMetadata: ArchitectIssueMetadataInput;
    };
  };
  notes: string[];
};

export function buildArchitectDecisionSafetyPlan(input: {
  decision: ArchitectDecisionRecordInput;
  existingAdrPages: ArchitectAdrCandidatePage[];
  architectureGapReason?: string;
}): ArchitectDecisionSafetyPlan {
  const adrTitle = buildArchitectDecisionPageTitle(input.decision.title);
  const conflicts = findDecisionConflicts(input.decision, input.existingAdrPages);
  const blockingConflicts = conflicts.filter(
    (conflict) => conflict.severity === "blocking"
  );
  const recommendedAction = chooseRecommendedAction(conflicts);
  const blockReason = buildBlockReason({
    ...(input.architectureGapReason
      ? { gapReason: input.architectureGapReason }
      : {}),
    conflicts: blockingConflicts,
    reviewMode: input.decision.requiredReviewMode
  });
  const shouldBlock = Boolean(blockReason);
  const architectureMetadata = buildArchitectureMetadata(
    input.decision,
    adrTitle,
    blockReason
  );
  const boundedSpikePlan = buildBoundedSpikePlan(
    input.decision,
    adrTitle,
    architectureMetadata
  );
  const notes = buildSafetyNotes(recommendedAction, conflicts, boundedSpikePlan);

  return {
    adrTitle,
    existingAdrCount: input.existingAdrPages.length,
    conflicts,
    recommendedAction,
    blockingPlan: {
      shouldBlock,
      ...(blockReason ? { reason: blockReason } : {}),
      affectedIssues: input.decision.affectedJiraIssues.map((issue) => ({
        issueKey: issue.issueKey,
        architectureMetadata
      }))
    },
    ...(boundedSpikePlan ? { boundedSpikePlan } : {}),
    notes
  };
}

export function buildArchitectureMetadata(
  decision: ArchitectDecisionRecordInput,
  adrTitle: string,
  architectureBlockReason?: string
): ArchitectIssueMetadataInput {
  const primaryFollowUp = decision.followUpActions[0];
  const technicalDebtFlag = decision.technicalDebtCreated.some(
    (item) => normalize(item) !== "none" && !normalize(item).includes("no extra")
  );

  return {
    adrTitle,
    adrStatus: decision.status,
    architectureSummary: decision.decision,
    decisionScope: decision.severityScope,
    confidenceLevel: decision.confidenceLevel,
    reviewMode: decision.requiredReviewMode,
    ...(primaryFollowUp?.followUpType
      ? { followUpType: primaryFollowUp.followUpType }
      : {}),
    migrationStyle: decision.migrationStyle,
    qualityAttributes: decision.targetQualityAttributes,
    hardConstraints: decision.hardConstraints,
    cleanupRequired: decision.cleanupObligations.length > 0,
    technicalDebtFlag,
    ...(architectureBlockReason !== undefined
      ? { architectureBlockReason }
      : {}),
    nextSkills: Array.from(
      new Set([
        "jira-architect",
        ...decision.followUpActions.map((action) => action.primaryOwningSkill)
      ])
    )
  };
}

function findDecisionConflicts(
  decision: ArchitectDecisionRecordInput,
  pages: ArchitectAdrCandidatePage[]
): ArchitectDecisionConflict[] {
  const wantedTitle = normalizeTitle(buildArchitectDecisionPageTitle(decision.title));
  const affectedIssues = decision.affectedJiraIssues.map((item) => item.issueKey);
  const conflicts: ArchitectDecisionConflict[] = [];

  for (const page of pages) {
    const pageStatus = inferAdrStatus(page);
    const pageActive = isActiveAdrStatus(pageStatus);
    const pageIssueOverlap = affectedIssues.filter((issueKey) =>
      pageMentionsIssue(page, issueKey)
    );

    if (normalizeTitle(page.title) === wantedTitle) {
      conflicts.push({
        type: "same-title",
        severity: "advisory",
        pageId: page.id,
        title: page.title,
        ...(pageStatus ? { status: pageStatus } : {}),
        ...(page.webUrl ? { webUrl: page.webUrl } : {}),
        reason: "Existing ADR has the same normalized title; update is safer than duplicate creation.",
        affectedIssueKeys: pageIssueOverlap
      });
      continue;
    }

    if (pageIssueOverlap.length > 0) {
      conflicts.push({
        type: pageActive
          ? "active-decision-overlap"
          : "affected-issue-overlap",
        severity: pageActive ? "blocking" : "advisory",
        pageId: page.id,
        title: page.title,
        ...(pageStatus ? { status: pageStatus } : {}),
        ...(page.webUrl ? { webUrl: page.webUrl } : {}),
        reason: pageActive
          ? "Active ADR already references one or more affected issues."
          : "Inactive ADR references one or more affected issues.",
        affectedIssueKeys: pageIssueOverlap
      });
    }
  }

  return conflicts;
}

function chooseRecommendedAction(
  conflicts: ArchitectDecisionConflict[]
): ArchitectDecisionSafetyAction {
  if (conflicts.length === 0) {
    return "create-new-adr";
  }

  if (conflicts.some((conflict) => conflict.type === "same-title")) {
    return "update-existing-adr";
  }

  const blockingConflicts = conflicts.filter(
    (conflict) => conflict.severity === "blocking"
  );

  if (blockingConflicts.length === 1) {
    return "supersede-existing-adr";
  }

  if (blockingConflicts.length > 1) {
    return "manual-review";
  }

  return "create-new-adr";
}

function buildBlockReason(input: {
  gapReason?: string;
  conflicts: ArchitectDecisionConflict[];
  reviewMode: string;
}): string | undefined {
  if (input.gapReason?.trim()) {
    return input.gapReason.trim();
  }

  if (input.conflicts.length > 0) {
    return `Architecture decision conflicts with active ADR(s): ${input.conflicts
      .map((conflict) => conflict.title)
      .join(", ")}.`;
  }

  if (input.reviewMode === "manual-human-review") {
    return "Architecture decision requires manual human review before implementation.";
  }

  return undefined;
}

function buildBoundedSpikePlan(
  decision: ArchitectDecisionRecordInput,
  adrTitle: string,
  architectureMetadata: ArchitectIssueMetadataInput
): ArchitectDecisionSafetyPlan["boundedSpikePlan"] {
  if (
    decision.confidenceLevel !== "low" &&
    decision.requiredReviewMode !== "bounded-spike"
  ) {
    return undefined;
  }

  const reason =
    decision.confidenceLevel === "low"
      ? "Decision confidence is low."
      : "Decision explicitly requires bounded spike.";

  return {
    required: true,
    reason,
    createIssuePayload: {
      issueType: "Task",
      summary: `[Spike] Architecture evidence for ${adrTitle}`,
      description: [
        `Purpose: gather bounded evidence for ${adrTitle}.`,
        "",
        `Reason: ${reason}`,
        "",
        "Expected output:",
        "- evidence summary",
        "- confirmed or revised ADR direction",
        "- affected Jira issues to unblock or keep blocked"
      ].join("\n"),
      labels: ["architecture", "adr", "bounded-spike"],
      architectureMetadata: {
        ...architectureMetadata,
        architectureBlockReason:
          "Bounded architecture spike must finish before implementation continues."
      }
    }
  };
}

function buildSafetyNotes(
  recommendedAction: ArchitectDecisionSafetyAction,
  conflicts: ArchitectDecisionConflict[],
  boundedSpikePlan?: ArchitectDecisionSafetyPlan["boundedSpikePlan"]
): string[] {
  const notes = [`Recommended ADR action: ${recommendedAction}.`];

  if (conflicts.length > 0) {
    notes.push(`Detected ${conflicts.length} possible ADR conflict(s).`);
  }

  if (boundedSpikePlan?.required) {
    notes.push("Bounded spike work should be created before implementation.");
  }

  return notes;
}

function inferAdrStatus(page: ArchitectAdrCandidatePage): string | undefined {
  const statusLabel = page.labels.find((label) =>
    /^adr-status-/i.test(label.trim())
  );

  if (statusLabel) {
    return statusLabel.replace(/^adr-status-/i, "").trim().toLowerCase();
  }

  const statusMatch = page.bodyStorage?.match(
    /<h2>\s*Status\s*<\/h2>\s*<p>\s*([^<]+)\s*<\/p>/i
  );

  return statusMatch?.[1]?.trim().toLowerCase();
}

function isActiveAdrStatus(status: string | undefined): boolean {
  return status === undefined || status === "proposed" || status === "accepted";
}

function pageMentionsIssue(
  page: ArchitectAdrCandidatePage,
  issueKey: string
): boolean {
  const normalizedIssueKey = normalize(issueKey);
  const text = normalize([page.title, page.bodyStorage ?? "", ...page.labels].join("\n"));

  return text.includes(normalizedIssueKey);
}

function normalizeTitle(value: string): string {
  return normalize(value.replace(/^adr:\s*/i, ""));
}

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}
