---
name: jira-project-bootstrap
description: Use when the task is to turn a project brief, repo, or kickoff request into a Jira project structure, starter backlog, and initial delivery plan. When the seeded backlog contains implementation, bugfix, refactor, integration, UI, backend, frontend, mobile, API, transport, auth, automation, or other behavior-changing delivery issues, immediately route to jira-quality-control before ending the turn so linked pre-development test plan issues are created or required.
---

# Jira Project Bootstrap

## Overview

Use this skill when a new project needs to be translated into a workable Jira setup. It turns a brief into an initial Jira operating shape: project mode, issue hierarchy, starter backlog, dependencies, and the first delivery slice that can actually be executed.

## When To Use

Use this skill when the user asks to:
- start a new Jira project from an idea, repo, or brief
- generate the first epic and starter issues automatically
- decide what the initial stories and tasks should be
- seed a clean backlog instead of an unstructured issue dump
- define what work should begin first after project creation

This skill is for project kickoff. Once the backlog exists, route refinement work to `$jira-intake-refinement`, day-to-day delivery to `$jira-execution-loop`, and status or workflow redesign to `$jira-workflow-admin`.

## Bootstrap Workflow

1. Read the brief and identify the project intent.
   Extract the business goal, target user or stakeholder, major constraints, and likely first release shape.
2. Confirm the Jira operating mode.
   Determine whether the project should be `team-managed` or `company-managed`, and whether it should start in `kanban` or `scrum`.
   Keep this flexible. Do not overfit the bootstrap to one tenant model if the target project can only be discovered at execution time.
3. Validate bootstrap readiness.
   If the brief is too vague to support a sensible epic structure and first delivery slice, stop and ask for the missing information.
4. Define the top-level structure.
   Create a minimal hierarchy that preserves clarity: usually one starter epic, several stories, and only the tasks needed to unlock execution.
5. Seed the starter backlog.
   Keep the initial backlog intentionally small, dependency-aware, and ready to start without guesswork.
6. Select the first delivery slice.
   Choose the smallest useful slice that proves the project can move from planning into real delivery.
7. Create or require quality companions.
   For each seeded implementation, bugfix, refactor, integration, UI, backend, frontend, mobile, API, transport, auth, automation, or other behavior-changing delivery issue, route to `$jira-quality-control` and create or require a linked pre-development test plan issue before ending the turn.
8. Hand off to operational skills.
   Once the project is seeded, switch to intake or execution skills instead of continuing to bootstrap indefinitely.

## Bootstrap Quality Companion Rule

When this skill routes to `$jira-project-bootstrap` and the seeded backlog contains any implementation, bugfix, refactor, integration, UI, backend, frontend, mobile, API, transport, auth, automation, or other behavior-changing delivery issue, immediately route to `$jira-quality-control` before ending the turn.

For each such delivery issue, create or require a linked pre-development test plan issue. Use a native validation/test-style issue type when available. If unavailable, use the tenant-safe fallback: `Task` with `quality`, `quality-test`, `quality-validation`, and `pre-dev-test-plan` labels.

A single general QA or stability issue is not enough unless it explicitly covers and links to every affected delivery issue.

## Seeding Rules

- Prefer a small, high-quality backlog over a large speculative one.
- Use explicit parent-child relationships instead of flat lists.
- Keep user-facing outcomes as stories and technical enablement as tasks whenever possible.
- Create bugs only for actual defects or known migration risks.
- Add dependencies when sequencing matters; do not bury them in prose.
- Make the first issues executable, not merely descriptive.
- Do not finish bootstrap with behavior-changing delivery issues that lack linked pre-dev test plan coverage or an explicit note that an existing linked test plan is current and sufficient.
- Do not try to model the entire future roadmap on day one.
- If the target project cannot support a requested issue type, workflow step, or admin action through the available AI tools, note the gap and surface the required manual Jira step.

## Output Contract

When responding, structure the bootstrap result like this:

1. Recommended project shape
   Include project type, tenant mode, and delivery mode.
2. Starter backlog
   Include exactly one starter epic, then the first stories and day-one tasks.
3. Dependency map
   Show which issues block which outcomes.
4. Quality companion plan
   List each behavior-changing delivery issue and its linked pre-dev test plan issue, or the explicit reason a current existing test plan is sufficient.
5. First delivery slice
   Explain what should be built first and why.
6. Open questions
   List only the missing information that blocks safe seeding.

Do not label technical setup, scaffolding, mock data, or integration plumbing as stories unless they deliver direct user-facing value.

## First Slice Rules

The first slice should:
- demonstrate meaningful progress toward the project goal
- have a clear dependency chain
- be small enough to explain in one paragraph
- leave the project in a state where the next issue can be pulled immediately

Good first slices often focus on setup, access, the primary user flow, or the first critical integration.

## Bootstrap Guardrails

- Do not create a project shell with no usable starter work.
- Treat project creation itself as an admin-risk write. It may require explicit confirmation even when ordinary Jira issue operations run live by default.
- Do not overfit the hierarchy before the first delivery cycle begins.
- Do not copy company-managed governance into team-managed projects without checking fit.
- Do not generate dozens of tickets from a weak brief just to appear thorough.
- Do not hardcode one workflow into every bootstrap; inspect the project or tenant capabilities first and adapt.
- If the project will require stronger workflow control later, document that as follow-up admin work instead of forcing it into day-one seeding.

## References

Load these when bootstrapping from a brief:
- `references/bootstrap-inputs.md`
- `references/backlog-seeding-pattern.md`
- `references/delivery-slices.md`
