import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateArchitectActivation,
  mergeArchitectRequiredSkill
} from "./architect-activation.js";

test("architect activation triggers on kickoff and architecture keywords", () => {
  const assessment = evaluateArchitectActivation({
    summary: "Seed kickoff checklist and architecture artifacts",
    descriptionText: "Bootstrap must decide module boundary and data flow.",
    labels: ["story", "kickoff"]
  });

  assert.equal(assessment.shouldActivate, true);
  assert.equal(assessment.severity, "advisory");
  assert.ok(assessment.reasonCodes.includes("project-start"));
  assert.ok(assessment.reasonCodes.includes("keyword-signal"));
  assert.deepEqual(assessment.recommendedRequiredSkills, ["jira-architect"]);
});

test("architect activation becomes blocking when architecture block exists", () => {
  const assessment = evaluateArchitectActivation({
    summary: "Refactor shared abstraction",
    architectureMetadata: {
      qualityAttributes: [],
      hardConstraints: [],
      nextSkills: [],
      source: "yaml-code-block",
      architectureBlockReason: "Need ADR before implementation."
    }
  });

  assert.equal(assessment.shouldActivate, true);
  assert.equal(assessment.severity, "blocking");
  assert.ok(assessment.reasonCodes.includes("architecture-block"));
});

test("mergeArchitectRequiredSkill deduplicates jira-architect", () => {
  const merged = mergeArchitectRequiredSkill(
    ["jira-core", "jira-architect"],
    {
      shouldActivate: true,
      reasonCodes: ["keyword-signal"],
      reasons: ["Architecture-significant keyword or label detected."],
      recommendedRequiredSkills: ["jira-architect"],
      severity: "advisory"
    }
  );

  assert.deepEqual(merged, ["jira-core", "jira-architect"]);
});
