# Change Control

This document defines the change-control planning layer for the project.

## Intent

- Classify incoming work as one of:
  - `change_request`
  - `bug`
  - `reopen`
  - `new_scope`
- Surface ambiguity explicitly instead of guessing when multiple categories fit.
- Analyze downstream issue, dependency, and release-order impact before live Jira mutation.
- Turn approved change scope into an explicit Jira operation plan with an audit trail.

## Planning model

The change-control layer is planning-first.

It should:

- classify the incoming change with a confidence level and ambiguity reasons
- analyze affected issues and dependency edges
- recommend whether existing work should be modified, reopened, or split
- emit a concise decision-log payload
- detect when a high-impact approval gate is required before execution

It should not:

- silently expand existing issues with net-new scope
- relink dependencies without an explicit rationale
- reopen completed work without surfacing the release-order and audit impact

## High-impact triggers

Treat a change as high-impact when one or more of these are true:

- the classification is still ambiguous
- a completed issue would be reopened
- dependency relinks change the execution graph
- the change affects multiple execution paths or open downstream work

High-impact changes should stop for explicit approval before live execution.

## Expected outputs

Every non-trivial change plan should produce:

- a structured intake result
- an impact-analysis result
- an ordered Jira operation plan
- a short decision log
- approval-gate guidance when needed
