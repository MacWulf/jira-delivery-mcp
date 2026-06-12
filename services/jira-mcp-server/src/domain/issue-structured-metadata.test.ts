import assert from "node:assert/strict";
import test from "node:test";

import {
  buildIssueDescriptionWithStructuredMetadata,
  parseIssueStructuredMetadataFromDescription
} from "./issue-structured-metadata.js";

test("structured metadata round-trip preserves body and parses both blocks", () => {
  const description = buildIssueDescriptionWithStructuredMetadata(
    "Implement shared boundary cleanup.",
    {
      executionMetadata: {
        requiredSkills: ["jira-core", "jira-quality-control"],
        executionMode: "implement"
      },
      architectureMetadata: {
        adrUrl: "https://confluence.example/adr-12",
        adrTitle: "ADR: Split boundary",
        architectureSummary: "Split shared module boundary.",
        decisionScope: "cross-module",
        hardConstraints: ["Module A must not call Module B directly."],
        nextSkills: ["jira-execution-loop"]
      }
    }
  );

  assert.ok(description?.includes("## Execution metadata"));
  assert.ok(description?.includes("## Architecture metadata"));

  const parsed = parseIssueStructuredMetadataFromDescription(description);

  assert.equal(parsed.descriptionText, "Implement shared boundary cleanup.");
  assert.deepEqual(
    parsed.executionMetadata?.requiredSkills.map((item) => item.value),
    ["jira-core", "jira-quality-control"]
  );
  assert.equal(parsed.executionMetadata?.executionMode, "implement");
  assert.equal(
    parsed.architectureMetadata?.adrUrl,
    "https://confluence.example/adr-12"
  );
  assert.equal(parsed.architectureMetadata?.decisionScope, "cross-module");
  assert.deepEqual(parsed.architectureMetadata?.nextSkills, [
    "jira-execution-loop"
  ]);
});

test("structured metadata rebuild removes stale blocks before writing new ones", () => {
  const existing = [
    "Base context.",
    "",
    "## Execution metadata",
    "",
    "```yaml",
    "codex:",
    "  execution_mode: implement",
    "```",
    "",
    "## Architecture metadata",
    "",
    "```yaml",
    "architect:",
    '  architecture_summary: "Old summary"',
    "```"
  ].join("\n");

  const rebuilt = buildIssueDescriptionWithStructuredMetadata(existing, {
    architectureMetadata: {
      architectureSummary: "New summary",
      architectureBlockReason: "Need ADR first."
    }
  });

  assert.equal(
    rebuilt,
    [
      "Base context.",
      "",
      "## Architecture metadata",
      "",
      "```yaml",
      "architect:",
      '  architecture_summary: "New summary"',
      '  architecture_block_reason: "Need ADR first."',
      "```"
    ].join("\n")
  );
});
