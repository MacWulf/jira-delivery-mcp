# Jira Operating Loop

This skill supports the day-to-day delivery loop in Jira.

## Core Loop

1. Find the next work item that is ready, unblocked, and aligned with the current goal.
2. Confirm the issue type, parent, acceptance criteria, and dependencies.
3. For implementation, bugfix, refactor, integration, automation, API, UI, backend, frontend, or behavior-changing work, use `jira-quality-control` to create or update the linked pre-dev test plan before code edits.
4. If the work is architecture-impacting, medium-or-larger refactor, ADR-related, cross-boundary, contradiction-prone, or blocked by hard constraints, use `jira-architect` before continuing implementation.
5. Move the issue out of `To Do` and into the correct active state only when the work is actually starting.
6. Work the issue in small, reviewable steps.
7. Add a concise start or progress note when work begins or context materially changes.
8. Run the validations the assistant can actually perform and preserve the resulting evidence.
9. Advance the issue to the next valid workflow state and continue until a real blocker or explicit human gate is reached.
10. Pick the next ready issue and repeat.

## Operating Rules

- Do not start work on items that are missing a parent when the project expects one.
- Do not transition an issue just to signal intent.
- Do not perform substantive implementation while the issue still sits in `To Do`.
- Do not perform substantive implementation before the linked pre-dev test plan is created, updated, or confirmed current and sufficient.
- Do not perform affected implementation while a mandatory architecture gate, ADR conflict, or bounded spike remains unresolved.
- When `jira-architect` applies, carry its ADR link, hard constraints, affected-work summary, and next-skill routing into the issue before advancing.
- Prefer a combined status-and-progress action such as `sync_issue_progress` when the tool surface supports it.
- Respect blockers and dependency links before starting execution.
- Prefer small, explicit comments over long status updates.
- Keep the board truthful: the status must match the real state of work.
- Do not stop at implementation-complete if Jira still exposes an executable review, QA, or other assistant-owned step.
- If the workflow includes `User Testing`, use it as the human-owned validation stop after technical `QA`.
- Treat `In Review` and `QA` as pass-through assistant steps unless the issue metadata, labels, or workflow semantics make them true human gates.
- In legacy workflows without `User Testing`, continue past `QA` when the remaining validation is assistant-executable and Jira exposes a safe next transition.
- If a status is human-gated, move the issue there, attach the best available evidence, leave a concise handoff note, and stop.

## When To Pause

- The scope is unclear.
- The issue is missing acceptance criteria or a required parent.
- The dependency chain is incomplete.
- The architecture decision, ADR conflict check, or bounded spike evidence is incomplete for affected work.
- The workflow does not have a valid transition for the intended move.
- The issue has reached an explicit human gate.
