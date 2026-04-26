# Quality Governance

## Purpose

This document defines the quality-operating policy around bug intake, triage, reopened work, and retest-oriented queues.

It complements the quality-control tools. The tools create and link pre-development test plans and quality artifacts; this policy explains how those artifacts should be operated in a tenant-aware Jira setup.

## Bug Intake Minimum

Every bug should capture at least:

- a concise summary
- the affected parent work item when known
- actual behavior
- expected behavior
- reproduction steps
- environment when relevant
- evidence or an explicit note that evidence is missing

If the tenant does not expose dedicated fields for these items, the fallback is a structured description block. Do not downgrade this to an unstructured comment unless there is no safer option.

## Triage Outcomes

Bug triage should end in one of these explicit outcomes:

- `repro-ready`
  The bug has enough context to be worked.
- `need-info`
  Important bug context is missing. Do not silently keep this in the normal active queue.
- `duplicate`
  The issue should link to the canonical bug and leave a trace explaining the decision.
- `rejected`
  The report is not valid bug work for the target project.
- `non-repro`
  The issue could not be reproduced yet, but should not be closed as if it were resolved.

These are semantic outcomes, not mandatory status names. Use the actual tenant workflow when possible; otherwise preserve the outcome through labels, comments, or structured fields.

## Need-Info And Non-Repro

- `need-info` should be visible in Jira, not only implied in chat.
- `non-repro` should remain auditable and reopenable.
- neither state should be treated as a successful fix
- if the tenant cannot represent these as distinct statuses, use labels such as `need-info` and `non-repro`
- if SLA-style follow-up is needed, prefer a manual Jira admin reminder or project automation over hidden assistant memory

## Reopened Governance

If failed validation or later evidence shows the work is still defective:

- reopen the existing bug when that preserves history cleanly
- otherwise create a new bug and link it explicitly
- move the affected delivery item out of `Done`, `QA`, or `In Review` when the tenant supports a safe transition
- if the transition is unavailable, surface the missing Jira step explicitly

Reopened work is not just another comment. It is a quality state change and should be visible in the issue history.

## Quality Queues

Recommended queues:

- `triage inbox`
  New bug work that is not yet repro-ready.
- `need-info`
  Bugs waiting on missing details.
- `reopened or qa-failed`
  Bugs or parent items that returned from validation.
- `retest`
  Validation work that should be rerun after a fix.

These queues should be modeled with the smallest viable tenant-specific mechanism:

1. native workflow statuses when the project already has them
2. board filters or saved searches
3. labels plus comments as a fallback

## Automation Recommendations

Recommended light automation:

- add `need-info` when required evidence is missing
- add `reopened` when a bug or parent issue returns from quality verification
- remind or flag stale `need-info` issues after a defined time window
- route `qa-failed` or reopened items back into an active queue only through real Jira transitions

These are recommendations, not mandatory core behavior. If the available tenant or API surface cannot implement them safely, document the manual Jira step instead.

## Relationship To The Tooling

- `generate_validation_work` handles acceptance-criteria-driven pre-development test plans and validation artifacts
- `create_bug_from_validation_failure` handles failed-validation bug creation, evidence capture, and parent status correction
- `plan_retest_loop` handles the next quality-step recommendation
- admin discovery tools decide whether issue types and fields can be used directly, created safely, or must fall back

The governance policy should adapt to the discovered tenant model instead of assuming one fixed Jira workflow.
