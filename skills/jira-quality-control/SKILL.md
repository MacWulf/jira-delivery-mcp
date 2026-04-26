---
name: jira-quality-control
description: Use for any Jira-scoped development, repair, bugfix, refactor, behavior change, or implementation work that should be guided by tests before coding. Also use when the task is about pre-development test planning, existing test coverage review, acceptance-criteria-derived test cases, validation work, bug evidence, retest loops, edge cases, negative paths, or quality fallback planning in a tenant-aware Jira setup. Use as a companion to jira-execution-loop before code changes start.
---

# Jira Quality Control

## Overview

Use this skill when acceptance criteria need to become explicit pre-development test planning or validation work, when failed validation needs to turn into a bug with evidence, or when the project needs a tenant-aware retest loop. This skill keeps quality work separate from ordinary intake and execution so the assistant can preserve traceability, auditability, and test-first implementation guidance.

## When To Use

Use this skill when the user asks to:
- implement, build, fix, refactor, integrate, or change behavior for a Jira issue
- start or continue Jira delivery work that may affect code, tests, APIs, UI, workflow behavior, data behavior, or automation
- create or update test cases before new development or repair work starts
- inspect existing test coverage and decide what can be reused, updated, or must be added
- generate validation work from acceptance criteria
- create a bug from a failed validation or test result
- describe bugs with structured evidence instead of free-form notes
- triage bug intake into repro-ready, need-info, duplicate, rejected, or non-repro outcomes
- plan a retest loop after a fix or reopened defect
- decide how quality work should behave when the tenant does not support a preferred issue type or field policy
- define triage, reopened, or retest queues and their lightweight automation rules

If the request is really about workflow or field administration, combine this skill with `$jira-workflow-admin`.

## Always-On Companion Rule

Use this skill as a companion for any Jira-scoped development or repair work before implementation starts.

If `$jira-execution-loop` is used to start implementation, bugfixing, refactoring, integration, automation, API, UI, backend, frontend, or behavior-changing work, also use `$jira-quality-control`.

If `$jira-intake-refinement` produces an issue that is likely to require code changes, add `$jira-quality-control` as an expected follow-up skill.

Do not require the user to explicitly say "test", "QA", or "validation". If code changes will happen, infer that pre-dev test planning is needed unless the task is strictly documentation, Jira administration, status lookup, or discovery with no implementable scope yet.

## Quality Loop

1. Read the parent issue and the acceptance criteria.
   Use the current issue content, tenant model, and workflow semantics before choosing a quality action.
2. Plan test coverage before development or repair starts.
   For new work or fixes, inspect the parent issue and any known existing test coverage first. Create or update a dedicated pre-dev test plan issue before implementation begins. The test plan should guide the coding assistant toward the expected behavior, likely failure modes, edge cases, and existing tests that must be reused or changed.
3. Confirm active delivery state when implementation is already underway.
   If the assistant is actively implementing a Jira-scoped capability, the relevant delivery issue must not remain in `To Do`. Use `$jira-execution-loop` and prefer `sync_issue_progress` to move it into a real active state and leave a concise progress trace before treating the work as in flight.
4. Decide the smallest useful quality artifact.
   Prefer a native validation/test style issue when the tenant supports it. Prefer a native bug type when it exists. Otherwise fall back to the smallest workable type that still preserves traceability.
5. Preserve evidence structure.
   Capture environment, reproduction steps, actual result, expected result, and any attached evidence in the issue description or dedicated fields, not only in comments.
6. Link quality work back to delivery work.
   Keep the directly affected issue or issues, validation item, and bug connected so the history stays auditable. Parent epics or capabilities are supporting hierarchy, not a substitute for direct links to the violated work.
7. Plan the next retest step.
   If the tenant cannot support the preferred workflow cleanly, return a clear fallback or manual Jira step instead of assuming the assistant can do more than it can.

## Pre-Development Test Plan

For new development or repair work, create one dedicated test plan issue per delivery issue by default.

Use a native validation/test-style issue type when available, such as `Validation`, `Test`, or the tenant's equivalent. If no suitable issue type exists, use `Task` with quality labels such as `quality`, `quality-test`, and `quality-validation`.

The test plan issue should include:
- linked delivery issue
- purpose of the test plan
- existing test coverage found
- tests to reuse unchanged
- tests to update
- missing tests to add
- happy-path test cases
- edge-case test cases
- negative or failure-path test cases
- acceptance criteria or expected behavior covered
- implementation gate stating that coding should be guided by this plan
- expected test files, suites, or validation surfaces when known

Use a single test plan issue unless the work is large enough that multiple modules, teams, or validation phases need separate ownership.

## Bug Evidence Repair

When a bug or bug fallback issue cannot close because structured evidence is missing or malformed, repair the issue description before retrying closure.

Use `update_issue` for the description update. Do not rely on `add_comment` to satisfy the evidence guard unless the active tool explicitly evaluates comments for that gate.

The repaired description must preserve the user's original context and include these sections:

- `## Steps to Reproduce`
- `## Actual Behavior`
- `## Expected Behavior`
- `## Evidence`

Add `## Environment` and `## Retest Notes` when the information is known. If evidence is unavailable, state that explicitly under `## Evidence` rather than omitting the section.

After the description update, re-run readiness or closure evaluation before transitioning to a done-like status.

If `update_issue` is unavailable in the active runtime, treat the tool surface as stale or incomplete and tell the user to edit the Jira issue description manually with the required sections. Do not claim that the project cannot be fixed only because comments are insufficient.

## Decision Rules

- Use the smallest issue type that still preserves quality traceability.
- Prefer native `Bug` and validation/test-style issue types when they exist.
- If the preferred issue type is missing, use a documented fallback such as `Task` plus quality labels and a parent link.
- Before implementation starts, do not create test work blindly. First check whether relevant tests already exist, then reuse, update, or add only the missing coverage.
- A pre-dev test plan is required for new development and repair work unless the parent issue already links to a current, sufficient test plan.
- The test plan should guide the coding assistant's implementation path, not merely record QA after the fact.
- Keep validation and bug evidence structured. Do not rely only on comments if a description block or dedicated fields are available.
- Use `update_issue` to repair missing or malformed bug evidence in the issue description before retrying closure.
- Validation items, bug creation, and parent issue status corrections are ordinary delivery writes and should execute live by default unless the runtime is explicitly in preview mode.
- Do not hardcode workflow or status names. Discover the project model first and adapt.
- If active implementation or defect work has started, do not leave the relevant Jira issue in `To Do` while creating downstream quality artifacts.
- Keep need-info, non-repro, duplicate, and reopened states explicit in Jira, even when they are represented through labels or filters instead of dedicated statuses.
- Do not mark work as done without evidence or retest confirmation.
- Do not assume `QA` is automatically human-owned. If the assistant can perform the remaining checks and Jira exposes the next transition, continue until a true human-validation gate or real blocker appears.
- A bug raised from failed validation, violated acceptance, or readiness mismatch must link directly to every affected issue and to the validation item when one exists.
- The bug description or handoff note must state which acceptance criterion or expected behavior was violated.
- Treat missing direct links to the violated issue or issues as incomplete quality traceability.
- If issue-type or field-policy changes are required, hand off to `$jira-workflow-admin`.

## Companion Skills

- `$jira-core`
  Use for routing and tenant-aware baseline behavior.
- `$jira-intake-refinement`
  Use for issue shaping, classification, and readiness.
- `$jira-business-analysis`
  Use when test cases need to be derived from business goals, stakeholder expectations, or underspecified acceptance criteria.
- `$jira-execution-loop`
  Use for status movement, handoff, and closure.
- `$jira-workflow-admin`
  Use for issue types, fields, screens, schemes, and admin-safe migration planning.

## References

Load these when the quality path is unclear or the tenant model matters:
- `references/quality-operating-model.md`
- `references/fallback-policy.md`
- `references/triage-governance.md`
