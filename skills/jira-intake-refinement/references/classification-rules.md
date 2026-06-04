# Classification Rules

Use these rules to turn raw project ideas into workable Jira items.

## Issue Type Hierarchy

Use the hierarchy only when it adds clarity:

- `Epic`: a large outcome or theme.
- `Story`: user value or a product-facing result.
- `Task`: implementation work.
- `Bug`: a defect with observed incorrect behavior.
- `Sub-task`: a small execution step under an existing parent.

## Classification Rules

- If the item describes user value, prefer `Story`.
- If the item describes implementation work without user value framing, prefer `Task`.
- If the item describes broken behavior, prefer `Bug`.
- If the item is a large container for related work, prefer `Epic`.
- If the item cannot stand alone, make it a `Sub-task` under a valid parent.
- If the item is a medium-or-larger refactor, cross-boundary change, ADR need, hard constraint, contradiction, or bounded spike, add `jira-architect` as the architecture decision companion before execution.

## Required Parent Logic

Do not leave child work floating without context.

- `Story` and `Task` should usually belong under an `Epic` when the work is part of a larger initiative.
- `Sub-task` must have a parent issue.
- If the parent is missing, create or identify the parent before execution starts.

## Readiness Rules

An item is ready when it has enough information to execute without guesswork.

Check for:

- clear summary
- short but specific description
- acceptance criteria or success condition
- known dependencies
- architecture decision status, ADR link, or explicit non-applicability note when architecture impact is plausible
- owner or intended assignee when relevant
- reproducible steps for bugs

## Bug Intake Rules

For bugs, capture:

- expected behavior
- actual behavior
- reproduction steps
- environment or version if relevant
- severity or impact

## Refinement Rule

If a ticket is vague, do not execute it. Refine it first, split it if needed, and only then move it into the delivery queue.
