---
name: jira-core
description: Use when the task is about setting up, classifying, or operating Jira work in a tenant-aware way. This skill routes the work to the right companion Jira skill and defines the baseline operating model.
---

# Jira Core

## Overview

Use this skill as the entry point for Jira work. It decides whether the task is about backlog intake, delivery execution, or workflow administration, and then applies the right companion skill instead of forcing one monolithic Jira playbook onto every situation.

## When To Use

Use this skill when the user asks to:
- bootstrap a new Jira project from a brief, repo, or kickoff note
- set up a new Jira project from a brief, roadmap, or repo
- decide what issue types and relationships should exist
- turn a vague delivery request into a Jira operating plan
- choose between team-managed and company-managed Jira behavior
- coordinate multiple Jira-related subskills in one flow

Do not stop at generic advice. Route the task into the most relevant companion skill and keep the Jira behavior consistent.

## Routing Decision Tree

1. Detect the project mode first.
   Determine whether the target project is team-managed or company-managed. Do not assume company-managed conventions apply everywhere.
2. Identify the job to be done.
   If the work is about creating the initial Jira structure, starter backlog, and first delivery slice from a brief, use `$jira-project-bootstrap`.
3. Identify the job to be done.
   If the work is about issue shaping, classification, backlog readiness, or acceptance criteria, use `$jira-intake-refinement`.
4. Handle day-to-day delivery with a separate loop.
   If the work is about choosing the next issue, moving status, updating progress, or closing work safely, use `$jira-execution-loop`.
5. Escalate admin changes explicitly.
   If the work is about statuses, workflows, screens, field policies, schemes, or migration planning, use `$jira-workflow-admin`.
6. Combine skills when necessary.
   A new project bootstrap often needs all three: first admin design, then intake seeding, then execution policy.

## Core Operating Model

- Treat Jira as the delivery system of record once the project has been seeded.
- Preserve traceability between project brief, epics, stories, tasks, bugs, and dependencies.
- Prefer explicit parent-child relationships over loose naming conventions.
- Discover the actual project workflow, issue types, and admin capabilities before proposing changes.
- Do not create workflow or field policy that the active project type cannot support cleanly.
- Keep admin rules strict and execution behavior lightweight.
- When the tenant model is unknown, inspect first and only then apply policy.
- If the required Jira change is not safely achievable through the available AI tools or public API, stop and tell the user exactly which manual step is required.

## Project Bootstrap Pattern

When bootstrapping a project from scratch:

1. Read the brief or project description.
2. Use `$jira-project-bootstrap` to create the initial project shape.
   Let it determine the first epic structure, starter backlog, and first delivery slice.
3. Determine delivery mode.
   Choose Kanban or Scrum based on the operating model the user actually wants.
4. Determine Jira project mode.
   Prefer team-managed for fast, isolated setups and company-managed for standardized, shared governance.
5. Define the issue hierarchy and workflow policy.
   Do not hardcode a lifecycle into the skill output. First inspect what the target project already supports, then adapt or propose a delta.
6. Seed the initial backlog with parent links, acceptance criteria, and dependencies.
7. Start the execution loop only after the first issues are ready.

## Companion Skills

- `$jira-project-bootstrap`
  Use for creating the first Jira structure from a brief, repo, or kickoff context.
- `$jira-intake-refinement`
  Use for issue typing, backlog shaping, readiness checks, and intake templates.
- `$jira-execution-loop`
  Use for next issue selection, status movement, delivery updates, handoff, and closure.
- `$jira-workflow-admin`
  Use for workflow design, status semantics, screen and field policy, and migration-safe admin changes.

## References

Load these when the decision is unclear or the tenant model matters:
- `references/tenant-modes.md`
- `references/operating-model.md`
