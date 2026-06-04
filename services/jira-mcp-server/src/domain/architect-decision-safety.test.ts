import assert from "node:assert/strict";
import test from "node:test";

import {
  buildArchitectDecisionSafetyPlan,
  buildArchitectureMetadata
} from "./architect-decision-safety.js";
import type { ArchitectDecisionRecordInput } from "./architect-decision-record.js";

const baseDecision: ArchitectDecisionRecordInput = {
  title: "Split execution metadata boundary",
  status: "accepted",
  context: "Issue metadata has architecture and execution concerns.",
  decision: "Keep architecture metadata separate from execution metadata.",
  decisionReason: "Different skills consume different signals.",
  confidenceLevel: "high",
  severityScope: "cross-module",
  targetQualityAttributes: ["maintainability"],
  hardConstraints: ["Architecture block reason must stay machine-readable."],
  rejectedAlternatives: [
    {
      option: "Single metadata block",
      reason: "Blends concerns."
    }
  ],
  affectedJiraIssues: [
    {
      issueKey: "ARCH-107",
      relationship: "decision safety implementation",
      impact: "direct"
    }
  ],
  migrationStyle: "incremental",
  cleanupObligations: ["Remove stale duplicate metadata blocks."],
  technicalDebtCreated: ["No extra debt accepted."],
  followUpActions: [
    {
      summary: "Implement decision safety planner",
      followUpType: "new-module",
      primaryOwningSkill: "jira-quality-control",
      migrationStyle: "incremental",
      cleanupRequiredBeforeClosure: true
    }
  ],
  requiredReviewMode: "no-extra-review",
  linkedArchitecturePages: [],
  projectKey: "KAN"
};

test("decision safety recommends updating same-title ADR", () => {
  const plan = buildArchitectDecisionSafetyPlan({
    decision: baseDecision,
    existingAdrPages: [
      {
        id: "123",
        title: "ADR: Split execution metadata boundary",
        labels: ["adr", "adr-status-accepted"],
        bodyStorage: "<h2>Status</h2><p>accepted</p>"
      }
    ]
  });

  assert.equal(plan.recommendedAction, "update-existing-adr");
  assert.equal(plan.conflicts[0]?.type, "same-title");
  assert.equal(plan.blockingPlan.shouldBlock, false);
});

test("decision safety blocks when active ADR overlaps affected issue", () => {
  const plan = buildArchitectDecisionSafetyPlan({
    decision: baseDecision,
    existingAdrPages: [
      {
        id: "456",
        title: "ADR: Existing architecture direction",
        labels: ["adr", "adr-status-accepted"],
        bodyStorage:
          "<h2>Status</h2><p>accepted</p><h2>Affected Jira Issues</h2><p>ARCH-107</p>"
      }
    ]
  });

  assert.equal(plan.recommendedAction, "supersede-existing-adr");
  assert.equal(plan.blockingPlan.shouldBlock, true);
  assert.match(plan.blockingPlan.reason ?? "", /Existing architecture direction/);
  assert.equal(
    plan.blockingPlan.affectedIssues[0]?.architectureMetadata.architectureBlockReason,
    plan.blockingPlan.reason
  );
});

test("decision safety creates bounded spike plan for low confidence", () => {
  const plan = buildArchitectDecisionSafetyPlan({
    decision: {
      ...baseDecision,
      confidenceLevel: "low",
      requiredReviewMode: "bounded-spike"
    },
    existingAdrPages: []
  });

  assert.equal(plan.boundedSpikePlan?.required, true);
  assert.equal(plan.boundedSpikePlan?.createIssuePayload.issueType, "Task");
  assert.ok(
    plan.boundedSpikePlan?.createIssuePayload.labels.includes("bounded-spike")
  );
  assert.equal(
    plan.boundedSpikePlan?.createIssuePayload.architectureMetadata.architectureBlockReason,
    "Bounded architecture spike must finish before implementation continues."
  );
});

test("architecture metadata carries hard constraints and routing", () => {
  const metadata = buildArchitectureMetadata(
    baseDecision,
    "ADR: Split execution metadata boundary"
  );

  assert.deepEqual(metadata.hardConstraints, [
    "Architecture block reason must stay machine-readable."
  ]);
  assert.deepEqual(metadata.nextSkills, [
    "jira-architect",
    "jira-quality-control"
  ]);
  assert.equal(metadata.cleanupRequired, true);
  assert.equal(metadata.technicalDebtFlag, false);
});
