import type { ArchitectIssueMetadata } from "./issue-architecture-metadata.js";

export type ArchitectActivationAssessment = {
  shouldActivate: boolean;
  reasonCodes: string[];
  reasons: string[];
  recommendedRequiredSkills: string[];
  severity: "none" | "advisory" | "blocking";
};

export function evaluateArchitectActivation(input: {
  summary?: string;
  descriptionText?: string;
  labels?: string[];
  issueTypeName?: string;
  architectureMetadata?: ArchitectIssueMetadata;
}): ArchitectActivationAssessment {
  const summary = input.summary ?? "";
  const descriptionText = input.descriptionText ?? "";
  const combinedText = normalize(`${summary}\n${descriptionText}`);
  const labels = new Set((input.labels ?? []).map(normalize));
  const reasonCodes: string[] = [];
  const reasons: string[] = [];

  if (containsAny(combinedText, ["kickoff", "bootstrap", "project start"])) {
    pushReason(
      reasonCodes,
      reasons,
      "project-start",
      "Project kickoff or bootstrap signal detected."
    );
  }

  if (
    containsAny(combinedText, [
      "architecture",
      "adr",
      "refactor",
      "boundary",
      "module",
      "integration",
      "migration",
      "legacy replacement",
      "data flow",
      "shared abstraction"
    ]) ||
    Array.from(labels).some((label) =>
      containsAny(label, [
        "architecture",
        "adr",
        "refactor",
        "boundary",
        "module",
        "integration",
        "migration"
      ])
    )
  ) {
    pushReason(
      reasonCodes,
      reasons,
      "keyword-signal",
      "Architecture-significant keyword or label detected."
    );
  }

  if (
    input.architectureMetadata?.followUpType &&
    ["new-module", "refactor-existing", "replace-legacy", "split-boundary"].includes(
      input.architectureMetadata.followUpType
    )
  ) {
    pushReason(
      reasonCodes,
      reasons,
      "follow-up-type",
      `Follow-up type '${input.architectureMetadata.followUpType}' needs Architect involvement.`
    );
  }

  if (
    input.architectureMetadata?.decisionScope === "cross-module" ||
    input.architectureMetadata?.decisionScope === "system-wide"
  ) {
    pushReason(
      reasonCodes,
      reasons,
      "decision-scope",
      `Decision scope '${input.architectureMetadata.decisionScope}' needs Architect involvement.`
    );
  }

  if (input.architectureMetadata?.architectureBlockReason) {
    pushReason(
      reasonCodes,
      reasons,
      "architecture-block",
      "Architecture block reason already exists on issue."
    );
  }

  if (input.architectureMetadata?.hardConstraints.length) {
    pushReason(
      reasonCodes,
      reasons,
      "hard-constraints",
      "Existing architecture hard constraints must be respected."
    );
  }

  const severity = input.architectureMetadata?.architectureBlockReason
    ? "blocking"
    : reasonCodes.length > 0
      ? "advisory"
      : "none";

  return {
    shouldActivate: reasonCodes.length > 0,
    reasonCodes,
    reasons,
    recommendedRequiredSkills: reasonCodes.length > 0 ? ["jira-architect"] : [],
    severity
  };
}

export function mergeArchitectRequiredSkill(
  requiredSkills: string[],
  activation: ArchitectActivationAssessment
): string[] {
  if (!activation.shouldActivate) {
    return requiredSkills;
  }

  return Array.from(
    new Set([...requiredSkills, ...activation.recommendedRequiredSkills])
  );
}

function containsAny(text: string, values: string[]): boolean {
  return values.some((value) => text.includes(normalize(value)));
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function pushReason(
  codes: string[],
  reasons: string[],
  code: string,
  reason: string
): void {
  if (!codes.includes(code)) {
    codes.push(code);
  }

  if (!reasons.includes(reason)) {
    reasons.push(reason);
  }
}
