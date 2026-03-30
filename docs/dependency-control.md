# Dependency Control

## Purpose

A useful Jira assistant must understand more than issue CRUD. It has to know what is blocked, what is safe to start next, and how dependency changes affect delivery order.

This module defines a dependency-control operating model built around Jira issue links, especially the `Blocks` relationship.

## Core Rules

- Blocking logic is primarily based on Jira `Blocks` links.
- An issue is considered blocked when it has at least one inbound blocker that is not done.
- An issue that blocks downstream work is not automatically blocked itself, but it does carry delivery risk.
- `pick_next_issue` should only recommend work that is not done and has no open inbound blockers.
- Dependency state must be re-evaluated before lifecycle-changing actions.

## Assistant Responsibilities

### Dependency Discovery

- read inbound and outbound blocking links
- distinguish `blocked by` from `blocks`
- show which blockers remain open
- surface when an issue blocks active downstream work

### Dependency-Aware Execution

- do not start blocked issues
- do not close issues when dependency state contradicts workflow policy
- prefer startable work during next-issue selection
- include dependency context in issue-selection reasoning

### Dependency Maintenance

- build `Blocks` links during backlog seeding
- update the dependency graph when scope changes
- flag stale, missing, or duplicate dependency links
- document dependency removals or relinks when they carry product impact

## Non-Goals

The current dependency-control layer does not attempt full project scheduling or Gantt-style planning. Its purpose is to keep the board truthful and the execution loop safe.

## Relationship to Other Modules

- `Workflow Governance`: workflow policy may require a dedicated lifecycle response to blockers
- `Quality Control`: failed tests and bugs can introduce new blockers
- `Change Control`: reopened or changed work can create dependency drift
- `Traceability and Audit`: dependency mutations should remain auditable
