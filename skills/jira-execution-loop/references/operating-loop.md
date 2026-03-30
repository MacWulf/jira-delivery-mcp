# Jira Operating Loop

This skill supports the day-to-day delivery loop in Jira.

## Core Loop

1. Find the next work item that is ready, unblocked, and aligned with the current goal.
2. Confirm the issue type, parent, acceptance criteria, and dependencies.
3. Move the issue to `In Progress` only when the work is actually starting.
4. Work the issue in small, reviewable steps.
5. Add concise comments when context changes or decisions are made.
6. Hand off, review, or close the issue using the project workflow.
7. Pick the next ready issue and repeat.

## Operating Rules

- Do not start work on items that are missing a parent when the project expects one.
- Do not transition an issue just to signal intent.
- Respect blockers and dependency links before starting execution.
- Prefer small, explicit comments over long status updates.
- Keep the board truthful: the status must match the real state of work.

## When To Pause

- The scope is unclear.
- The issue is missing acceptance criteria or a required parent.
- The dependency chain is incomplete.
- The workflow does not have a valid transition for the intended move.

