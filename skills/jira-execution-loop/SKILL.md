---
name: jira-execution-loop
description: "Use when the task is to operate Jira during delivery: pick the next issue, start work, track progress, hand off safely, and close work only when ready."
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

## Execution Loop

1. Select the next eligible issue.
   Prefer the highest-priority unblocked item that is actually ready. If the project distinguishes backlog, selected, review, blocked, or QA states, respect that model instead of flattening everything into a generic in-progress flow.
2. Validate readiness before starting.
   Do not start blocked, duplicate, or underspecified work just to keep statuses moving.
3. Transition into active work.
   Move the issue into the correct in-flight status for the project. Use the actual available Jira transition, not an imagined one, and discover the current workflow before assuming what "start", "review", or "done" means.
4. Record progress while working.
   Update comments, links, child items, and worklog only when they add real traceability.
5. Hand off cleanly.
   When work is ready for review, QA, or another owner, move it to the correct status and leave a concise handoff note.
6. Close only when done criteria are met.
   Do not close work because coding has started or because the issue feels mostly finished.
7. Pull the next issue deliberately.
   Re-check dependencies and capacity before starting the next item.

## Progress Rules

- Never start work that is blocked by an unresolved dependency unless the goal is explicitly to unblock it.
- Prefer status accuracy over status optimism.
- Treat workflow states as project-specific. The skill should adapt to the discovered workflow instead of forcing a hardcoded lifecycle.
- Use comments for decisions, blockers, and handoff context, not for narrating every small action.
- If new scope appears, create or link follow-up work instead of silently expanding the current ticket.
- If acceptance criteria changed, record that change before closing the issue.
- If a required Jira action cannot be completed through the available tools, stop and tell the user the exact manual step instead of inventing automation.

## Done Discipline

An issue is not ready for Done unless:
- the described outcome is complete
- linked follow-up work is created for any deferred scope
- blockers are either resolved or explicitly handed off
- the current workflow's review or QA step has been respected
- the ticket history explains why the issue can be considered complete

## References

Load these when running the delivery loop:
- `references/operating-loop.md`
- `references/done-readiness.md`
