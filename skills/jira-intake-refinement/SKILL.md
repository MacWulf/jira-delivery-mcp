---
name: jira-intake-refinement
description: Use when the task is to classify, shape, split, or clean Jira backlog items. This skill defines issue typing, parent-child expectations, readiness rules, and backlog hygiene. When a refined item is likely to require implementation, bugfixing, refactoring, integration, automation, API, UI, backend, frontend, or behavior-changing work, mark jira-quality-control as the expected follow-up so pre-dev test planning happens before coding.
---

# Jira Intake Refinement

## Overview

Use this skill to turn raw requests into workable Jira items. It handles issue classification, backlog refinement, readiness gating, and the minimum quality bar before delivery starts.

## When To Use

Use this skill when the user asks to:
- create backlog from a brief, spec, roadmap, or repo
- decide whether something should be an epic, story, task, bug, or sub-task
- split large work into smaller Jira items
- improve weak tickets before implementation starts
- define acceptance criteria, dependencies, and initial priority

## Classification Rules

Apply these rules unless the project has an explicit, documented alternative:

- Epic
  A large outcome or delivery stream that groups multiple stories and tasks.
- Story
  A unit of user or stakeholder value. A story should explain who benefits and what outcome they need.
- Task
  Implementation work, coordination work, or technical enablement. Prefer attaching it to a parent story or epic instead of leaving it floating.
- Bug
  A defect or regression with observable broken behavior. Keep bugs separate from feature tasks so defect flow remains visible.
- Sub-task
  A small execution slice under a parent item. Do not use sub-tasks as a substitute for proper story design.

If an item has no user value and no defect behavior, it is usually a task, not a story.

## Intake Workflow

1. Inspect the project conventions.
   Confirm issue types, parent rules, required fields, and whether the project is team-managed or company-managed.
2. Classify the request.
   Choose the smallest issue type that still preserves planning clarity. If the project does not currently support the required issue type and the available AI tools cannot safely add it, stop and ask the user for the manual Jira step.
3. Attach the parent relationship.
   Stories should normally roll into an epic. Tasks should normally support a story or epic. Sub-tasks must have a parent.
4. Define ready-to-build content.
   Add a clear summary, problem context, goal, acceptance criteria, dependencies, and key assumptions.
   If the item is likely to require code changes, record `$jira-quality-control` as the next companion skill so a pre-dev test plan issue is created or updated before implementation.
5. Split oversized work.
   If an item has multiple unrelated outcomes or cannot be completed in one focused delivery cycle, split it.
6. Reject weak tickets.
   If scope, ownership, or expected outcome is still ambiguous, move it back to refinement instead of pushing it into execution.

## Write Behavior

- Ordinary backlog shaping writes such as creating, updating, and linking issues should execute live by default.
- Do not stop for confirmation during normal refinement unless the runtime is explicitly in preview mode.
- If refinement depends on admin-risk changes such as issue-type creation or custom-field creation, surface the confirmation or manual Jira step explicitly.

## Ready Criteria

Do not treat an issue as ready unless it has:
- a clear summary
- the correct issue type
- the right parent, if applicable
- enough context to avoid guesswork
- acceptance criteria or an equivalent success definition
- known blockers and dependencies called out

For bugs, also require reproducible evidence whenever possible.

## Backlog Hygiene

- Avoid duplicate issues that describe the same outcome.
- Prefer one clear story plus supporting tasks over many shallow sibling tasks.
- Keep technical tasks linked to the user-facing story they enable.
- Use dependencies explicitly instead of hiding sequencing in text.
- Close or merge stale duplicates instead of letting them drift.

## References

Load these when refining or seeding backlog:
- `references/classification-rules.md`
- `references/templates.md`
