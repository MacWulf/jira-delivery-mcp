# Quality Operating Model

Use this skill package as the dedicated quality layer for Jira work.

## Responsibilities

- turn acceptance criteria into validation work
- create or update pre-development test plans before new development or repair work starts
- inspect existing test coverage before creating new test work
- preserve evidence for failed validation
- create bugs when validation fails
- plan retest loops after fixes or reopen events
- keep tenant-aware fallbacks explicit

## Core Principle

Quality work should stay traceable back to the delivery item that produced it.
For new development or repair work, quality starts before implementation. The assistant should inspect the parent issue, infer the behavior to protect, check for existing relevant test coverage, and create or update a dedicated pre-dev test plan issue before coding begins.
Do not hide validation intent inside comments if a structured issue or field can carry the information safely.
If implementation or defect-fixing is actively happening, the related issue should also leave `To Do` and receive a concise progress trace.
If implementation or defect work is already active, do not leave the relevant Jira issue in `To Do` while creating validation, bug, or retest artifacts.
When the workflow supports `User Testing`, distinguish assistant-owned technical `QA` from the later human-owned acceptance gate.
If the workflow does not separate `User Testing`, do not stop at `QA` by default when the remaining validation is still assistant-executable.

## Pre-Development Test Planning

Use one dedicated test plan issue per delivery issue by default.

The test plan should guide the coding assistant's implementation by making the expected behavior and risk areas explicit before code changes start.

Include:
- linked delivery issue
- existing test coverage found
- tests to reuse
- tests to update
- missing tests to add
- happy-path cases
- edge cases
- negative or failure-path cases
- acceptance criteria or expected behavior covered
- expected test files, suites, or validation surfaces when known

If a current linked test plan already exists and still covers the intended change, update it instead of creating a duplicate. If the old plan is stale or incomplete, revise it and keep the trace clear.

## Safety Rule

If the tenant cannot support the preferred issue type or field policy, fall back to a documented smaller shape and tell the operator which manual Jira step is needed.

## Traceability Rule

When validation fails or acceptance is violated:

- link the created bug directly to each affected issue
- link the validation item when it exists
- use parent epic or capability links only as supporting hierarchy
- state which acceptance criterion or expected behavior was violated

Do not treat parent-only linkage as sufficient quality traceability.
