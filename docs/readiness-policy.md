# Readiness Policy

## Purpose

The readiness policy adds an explicit Definition of Ready and Definition of Done layer on top of the workflow.

Workflow alone is not enough. A status model can tell the assistant where an issue is, but not whether the issue is actually ready to be selected, started, handed off, or closed.

## Policy Stages

- `select`
  Decide whether an issue is ready to enter the active queue.
- `start`
  Decide whether an issue is ready for implementation work.
- `handoff`
  Decide whether an issue is ready to move into review or QA-facing flow.
- `close`
  Decide whether an issue is ready to move into a done state.

## Policy Kinds

The policy distinguishes between these work-item kinds:

- `story`
- `task`
- `bug`
- `validation`
- `epic`
- `unknown`

The mapping is tenant-aware and based on actual Jira issue type and labels. Validation work is treated as a separate readiness kind even before the full quality-control layer is introduced.

## Core Rules

- every issue needs a summary
- every delivery item needs enough description context to avoid blind work
- work with open blockers is not ready for selection or start
- stories need explicit acceptance criteria
- tasks need either a parent or enough standalone context
- bugs need reproducible context in the description
- validation items need acceptance criteria and a parent relationship
- blocked or backlog-like items should not be closed directly

## Delivery-Loop Integration

The delivery loop uses the readiness policy before it:

- selects work
- starts work
- hands work off
- closes work

The next-issue picker also excludes items that fail readiness, not only items that are blocked by dependencies or workflow state.

## Current Scope

This policy is a prerequisite layer for later quality-control work.

It does not yet implement:

- automatic validation item generation
- bug creation from failed validation
- evidence capture
- retest orchestration

Those capabilities should build on top of the readiness contract instead of bypassing it.
