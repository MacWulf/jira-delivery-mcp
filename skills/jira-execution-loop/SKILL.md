---
name: jira-execution-loop
description: "Use when the task is to operate Jira during delivery: pick the next issue, start work, track progress, hand off safely, and close work only when ready. When delivery includes implementation, bugfixing, refactoring, integration, automation, API, UI, backend, frontend, or behavior-changing work, use jira-quality-control as a companion before coding so a pre-dev test plan guides the work."
---

# Jira Execution Loop

## Overview

Use this skill for day-to-day Jira delivery. It keeps issue movement disciplined, dependency-aware, and aligned with the project's actual workflow instead of blindly pushing everything to Done.

## When To Use

Use this skill when the user asks to:
- choose the next Jira issue to work on
- move issues through active delivery statuses
- record meaningful progress during implementation
- hand work to review, QA, or follow-up owners
- close issues safely and then continue to the next item
- reconcile an issue whose Jira workflow state drifted away from the real delivery state

## Execution Loop

1. Select the next eligible issue.
   Prefer the highest-priority unblocked item that is actually ready. If the project distinguishes backlog, selected, review, blocked, or QA states, respect that model instead of flattening everything into a generic in-progress flow.
2. Validate readiness before starting.
   Do not start blocked, duplicate, or underspecified work just to keep statuses moving.
3. Transition into active work.
   Move the issue out of `To Do` or equivalent backlog state before doing substantive implementation work. Use the actual available Jira transition, not an imagined one, and discover the current workflow before assuming what "start", "review", or "done" means.
4. Record progress while working.
   Leave a concise start or progress trace when work begins or materially changes state. Update comments, links, child items, and worklog only when they add real traceability.
5. Run the validations the assistant can actually perform.
   Use tests, checks, live validation, or other technically defensible evidence before claiming the work is ready for the next gate.
6. Advance until blocked.
   After implementation or validation completes, move the issue to the next valid workflow state and continue until the workflow, evidence, dependency state, or a human gate says to stop.
7. Close only when done criteria are met.
   Do not close work because coding has started or because the issue feels mostly finished.
7. Pull the next issue deliberately.
   Re-check dependencies and capacity before starting the next item.

## State Reconciliation

Use workflow-state reconciliation when Jira is out of sync with reality and the ordinary start, handoff, or close helpers are no longer the right tool.

- Prefer a direct single-hop transition when Jira exposes one.
- If the workflow only allows the issue to reach the target through intermediate states, use a deterministic multi-hop path through real Jira transitions.
- Multi-hop alone is not risky. Risk comes from terminal jumps, readiness bypass, human-gate bypass, or ambiguous target inference.
- Reconciliation must adapt to the discovered workflow. Do not hardcode status names or assume every project behaves like the reference workflow.
- Normal helper failure is not the end of the flow. If `start_issue_work`, `sync_issue_progress`, or `close_issue_if_ready` cannot continue through the ordinary path, run reconciliation analysis before escalating.
- If reconciliation is low or medium risk, let it repair the issue state automatically and then continue the helper flow.
- If reconciliation is high risk, stop with a structured reconciliation result instead of pretending the helper path is impossible.
- If reconciliation fails because the project workflow itself lacks the needed path, stop and hand off to `$jira-workflow-admin`.

## Progress Rules

- Never start work that is blocked by an unresolved dependency unless the goal is explicitly to unblock it.
- Prefer status accuracy over status optimism.
- Routine Jira issue writes such as transitions, comments, links, and progress updates should execute live by default. Do not ask for confirmation unless the runtime is explicitly in preview mode or the action is an admin-risk change.
- If real implementation work has started, the issue must not remain in `To Do` or an equivalent backlog status.
- Starting work requires two traces unless the tenant tooling prevents one of them:
  1. a real Jira transition into an active state such as `Selected` or `In Progress`
  2. a concise progress note, start note, or equivalent audit trace
- Prefer `sync_issue_progress` when available, because it enforces both the status move and the progress trace in one step.
- Treat workflow states as project-specific. The skill should adapt to the discovered workflow instead of forcing a hardcoded lifecycle.
- If the workflow supports `User Testing`, treat `QA` as assistant-owned or technically verifiable validation and `User Testing` as the human-owned acceptance gate.
- Human-gated statuses are resolved in this order: execution metadata, labels, then workflow default.
- When no issue-specific gate signal exists, stop at `User Testing` if it exists in the workflow; otherwise stop at `QA`.
- Do not stop at `In Review` or `QA` if the remaining checks are still technically executable by the assistant and Jira exposes the next safe transition. Those statuses are stopping points only when they are explicitly human-gated or when no further assistant-owned move is available.
- In workflows that do not yet separate `User Testing`, use `QA` as the fallback human handoff only when the remaining acceptance truly needs a person. Otherwise perform the available QA checks and continue.
- Use comments for decisions, blockers, and handoff context, not for narrating every small action.
- If new scope appears, create or link follow-up work instead of silently expanding the current ticket.
- If acceptance criteria changed, record that change before closing the issue.
- If a required Jira action cannot be completed through the available tools, stop and tell the user the exact manual step instead of inventing automation.
- If a human gate is reached, move the issue there when ready, attach the best available evidence, leave a concise handoff note, and stop there.
- Do not describe an issue as ready to close unless Jira currently exposes a real `Done` or `Accepted` transition from the issue's current state.
- Use reconciliation only to align state through real Jira transitions. Do not silently weaken start, handoff, or close readiness rules for normal delivery work.

## Enforcement Rule

- If the user asks to implement or continue a Jira-scoped issue, use `$jira-execution-loop` to activate the issue before editing code that belongs to that issue.
- If the user asks to implement, fix, refactor, integrate, automate, or otherwise change behavior for a Jira-scoped issue, use `$jira-quality-control` before code edits to create or update the linked pre-dev test plan.
- If the primary task uses another skill, such as `$jira-quality-control`, combine it with `$jira-execution-loop` whenever code or delivery work is already in flight.
- If the issue is still in `To Do`, do not treat that as a harmless reporting gap. Either transition it correctly or stop and surface the missing Jira step.

## Done Discipline

An issue is not ready for Done unless:
- the described outcome is complete
- linked follow-up work is created for any deferred scope
- blockers are either resolved or explicitly handed off
- the current workflow's review, QA, and human-testing gates have been respected
- the ticket history explains why the issue can be considered complete
- Jira exposes a real close transition from the current status

## References

Load these when running the delivery loop:
- `references/operating-loop.md`
- `references/done-readiness.md`
