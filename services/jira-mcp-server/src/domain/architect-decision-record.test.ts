import assert from "node:assert/strict";
import test from "node:test";

import { buildArchitectDecisionRecordPage } from "./architect-decision-record.js";

test("architect ADR page renders required structure", () => {
  const page = buildArchitectDecisionRecordPage({
    title: "Split execution and architecture metadata",
    status: "accepted",
    context: "Issue descriptions need deterministic sync blocks.",
    decision: "Use separate execution and architecture sections.",
    decisionReason: "Keeps routing and architecture trace distinct.",
    confidenceLevel: "high",
    severityScope: "cross-module",
    targetQualityAttributes: ["maintainability", "operability"],
    hardConstraints: ["Architecture block reason must stay machine-readable."],
    rejectedAlternatives: [
      {
        option: "Single mixed metadata block",
        reason: "Blends concerns."
      }
    ],
    affectedJiraIssues: [
      {
        issueKey: "ARCH-105",
        relationship: "direct sync backbone",
        impact: "direct"
      }
    ],
    migrationStyle: "incremental",
    cleanupObligations: ["Remove stale metadata blocks during rewrite."],
    technicalDebtCreated: ["No extra debt accepted."],
    followUpActions: [
      {
        summary: "Wire Confluence-first ADR lifecycle tool",
        followUpType: "new-module",
        primaryOwningSkill: "jira-documentation-publishing",
        migrationStyle: "incremental",
        cleanupRequiredBeforeClosure: false
      }
    ],
    requiredReviewMode: "no-extra-review",
    linkedArchitecturePages: [
      {
        title: "Architecture / ADR Index",
        url: "https://confluence.example/adr-index",
        relationship: "index"
      }
    ],
    projectKey: "KAN"
  });

  assert.equal(
    page.title,
    "ADR: Split execution and architecture metadata"
  );
  assert.ok(page.labels.includes("adr"));
  assert.ok(page.labels.includes("project-kan"));
  assert.match(page.bodyStorage, /<h2>Status<\/h2>/);
  assert.match(page.bodyStorage, /<h2>Hard Constraints<\/h2>/);
  assert.match(page.bodyStorage, /Architecture \/ ADR Index/);
});
