import { parseAcceptanceCriteriaFromText } from "./acceptance-criteria.js";

export type QualityEvidenceTemplate = {
  environment?: string;
  actualBehavior: string;
  expectedBehavior: string;
  reproductionSteps: string[];
  evidence?: string[];
};

export type ValidationWorkTemplate = {
  sourceIssueKey: string;
  sourceSummary?: string;
  acceptanceCriteria: string[];
};

export function buildValidationWorkDescription(
  template: ValidationWorkTemplate
): string {
  return [
    `Pre-development test plan derived from ${template.sourceIssueKey}.`,
    "",
    template.sourceSummary ? `Source summary: ${template.sourceSummary}` : "",
    "",
    "Purpose:",
    "- define the tests that should guide implementation before code changes start",
    "- make expected behavior, edge cases, and failure paths explicit",
    "- identify existing tests that should be reused or updated before adding new coverage",
    "",
    "Existing test coverage:",
    "- Found: not checked yet",
    "- Reuse unchanged: not decided yet",
    "- Update: not decided yet",
    "- Missing: derive from the acceptance criteria below",
    "",
    "Acceptance criteria or expected behavior to cover:",
    ...template.acceptanceCriteria.map((item, index) => `${index + 1}. ${item}`),
    "",
    "Test cases to define before implementation:",
    "- Happy path: cover the normal successful behavior for each relevant acceptance criterion",
    "- Edge cases: cover boundary values, missing optional data, ordering, idempotency, permissions, and state transitions when relevant",
    "- Negative paths: cover invalid input, failed dependencies, rejected operations, and expected error handling when relevant",
    "",
    "Implementation gate:",
    "- coding should follow this test plan",
    "- existing relevant tests should be reused or updated before duplicate tests are added",
    "- missing happy-path, edge-case, and negative-path coverage should be implemented or explicitly marked not applicable with a reason",
    "",
    "Expected outcome:",
    "- each acceptance criterion is verified explicitly",
    "- failed validation should create or update linked bug work",
    "- retest notes should remain attached to the quality flow"
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildBugEvidenceDescription(
  input: QualityEvidenceTemplate & {
    parentIssueKey: string;
    affectedIssueKeys?: string[];
    validationIssueKey?: string;
  }
): string {
  const affectedIssueKeys = Array.from(
    new Set([input.parentIssueKey, ...(input.affectedIssueKeys ?? [])])
  );

  return [
    `Bug created from validation failure for ${input.parentIssueKey}.`,
    `Affected issues: ${affectedIssueKeys.join(", ")}`,
    input.validationIssueKey
      ? `Validation issue: ${input.validationIssueKey}`
      : "",
    "",
    "## Environment",
    input.environment ? `- ${input.environment}` : "- not provided",
    "",
    "## Steps to Reproduce",
    ...(input.reproductionSteps.length
      ? input.reproductionSteps.map((step, index) => `${index + 1}. ${step}`)
      : ["1. Not provided"]),
    "",
    "## Actual Behavior",
    input.actualBehavior,
    "",
    "## Expected Behavior",
    input.expectedBehavior,
    "",
    "## Evidence",
    ...(input.evidence?.length
      ? input.evidence.map((item) => `- ${item}`)
      : ["- no evidence provided"])
  ].join("\n");
}

export function extractAcceptanceCriteriaForValidation(
  descriptionText: string
): string[] {
  return parseAcceptanceCriteriaFromText(descriptionText).items;
}
