---
name: jira-core
description: Use when the task is about setting up, classifying, or operating Jira work in a tenant-aware way. This skill routes the work to the right companion Jira skill and defines the baseline operating model. For any Jira-scoped development, implementation, bugfix, refactor, integration, automation, API, UI, backend, frontend, or behavior-changing work, route jira-quality-control as a companion before coding so test planning guides the implementation.
---

# Jira Core

## Overview

Use this skill as the entry point for Jira work. It decides whether the task is about backlog intake, quality control, documentation publishing, delivery execution, or workflow administration, and then applies the right companion skill instead of forcing one monolithic Jira playbook onto every situation.

When the task includes Confluence documentation, this skill should also ensure the outcome is human-readable and navigable, not only technically published.

## When To Use

Use this skill when the user asks to:
- bootstrap a new Jira project from a brief, repo, or kickoff note
- set up a new Jira project from a brief, roadmap, or repo
- decide what issue types and relationships should exist
- turn a vague delivery request into a Jira operating plan
- turn acceptance criteria into validation work or bug evidence
- publish repo-first project documentation into Confluence
- choose between team-managed and company-managed Jira behavior
- coordinate multiple Jira-related subskills in one flow
- fix Jira ticket state drift or align Jira to the real delivery state

Do not stop at generic advice. Route the task into the most relevant companion skill and keep the Jira behavior consistent.

## Routing Decision Tree

1. Detect the project mode first.
   Determine whether the target project is team-managed or company-managed. Do not assume company-managed conventions apply everywhere.
2. Identify the job to be done.
   If the work is about business-analysis style discovery, stakeholder-aware scoping, as-is/to-be analysis, requirement shaping, or bounded elicitation before backlog handoff, use `$jira-business-analysis`.
3. Identify the job to be done.
   If the work is about creating the initial Jira structure, starter backlog, and first delivery slice from a brief, use `$jira-project-bootstrap`.
   If the seeded backlog contains implementation, bugfix, refactor, integration, UI, backend, frontend, mobile, API, transport, auth, automation, or other behavior-changing delivery issues, immediately use `$jira-quality-control` before ending the turn so each such issue has a linked pre-dev test plan.
4. Identify the job to be done.
   If the work is about issue shaping, classification, backlog readiness, or acceptance criteria, use `$jira-intake-refinement`.
5. Identify the quality work.
   If the work is about validation items, bug evidence, retest loops, failed acceptance, or quality fallback behavior, use `$jira-quality-control`.
   If the work is any Jira-scoped code-changing implementation, bugfix, refactor, integration, API, UI, backend, frontend, automation, or behavior change, also use `$jira-quality-control` before coding even when the user did not mention tests.
6. Identify documentation publishing and governance.
   If the work is about kickoff docs, project documentation pages, Confluence publishing, repo-first documentation sync, Confluence governance, stale-page analysis, metadata policy, or documentation index planning, use `$jira-documentation-publishing`.
7. Handle day-to-day delivery with a separate loop.
   If the work is about choosing the next issue, moving status, updating progress, or closing work safely, use `$jira-execution-loop`.
   If the work is about correcting an issue that is in the wrong Jira status, reconciling workflow state to reality, or repairing status drift, also use `$jira-execution-loop` before treating the problem as workflow administration.
8. Escalate admin changes explicitly.
   If the work is about statuses, workflows, screens, field policies, schemes, or migration planning, use `$jira-workflow-admin`.
9. Combine skills when necessary.
   Business analysis often needs `$jira-business-analysis` first, then `$jira-intake-refinement`, `$jira-project-bootstrap`, `$jira-documentation-publishing`, or `$jira-quality-control` once the discovery output is stable.
   Quality flows often need both `$jira-quality-control` and `$jira-workflow-admin` when issue types or field policies must be shaped before validation can run.
   Documentation publishing often needs both `$jira-documentation-publishing` and `$jira-project-bootstrap` when a new project should get both Jira structure and Confluence-facing kickoff output.
   Confluence governance work should keep a `$jira-workflow-admin` mindset even when it stays inside `$jira-documentation-publishing`: plan safely, inspect first, and be explicit when only a manual admin step can satisfy the request.
   Human-facing Confluence work should prefer landing pages, dedicated deep-reference pages, and clear explanation of what skills or services do in reality instead of dumping raw technical notes into one page.
   Documentation asks should be routed by intent where possible:
   - publish or refresh a page
   - build or improve the space structure
   - explain a subsystem in human terms
   - plan governance or cleanup
   - review stale, orphaned, or low-trust pages
   Any Jira-scoped implementation request that is already in active delivery should also use `$jira-execution-loop`, and prefer `sync_issue_progress`, so the issue leaves `To Do` and gets a progress trace before the assistant behaves as if work is underway.
   Any Jira-scoped implementation request should also use `$jira-quality-control` before code changes start, so a linked pre-dev test plan issue guides happy-path, edge-case, and negative-path coverage.
   A new project bootstrap often needs intake, quality, and execution skills in sequence: first admin design, then seeding, then operational policy.
   A new project bootstrap must not end with behavior-changing delivery issues that lack linked pre-dev test plan coverage. A single general QA or stability issue is not enough unless it explicitly covers and links to every affected delivery issue.

## Core Operating Model

- Daily Jira execution should run live by default. Do not stop on dry-run during normal delivery work unless the runtime is explicitly configured for preview mode.
- Treat project creation, workflow mutation, issue-type creation, custom-field creation, and destructive cleanup as admin-risk writes that may require explicit confirmation.
- Treat Jira as the delivery system of record once the project has been seeded.
- Preserve traceability between project brief, epics, stories, tasks, bugs, and dependencies.
- Prefer explicit parent-child relationships over loose naming conventions.
- Advance an issue only as far as the current evidence and Jira workflow truth allow, and stop at the first real blocker instead of forcing closure.
- Distinguish ordinary delivery movement from workflow-state reconciliation. Reconciliation may align a drifted issue through a real Jira transition path, but it must not weaken the normal readiness gates used for day-to-day execution.
- When a normal delivery helper fails, prefer reconciliation analysis before declaring the action impossible. Safe low/medium-risk reconciliation may run automatically; risky reconciliation must stop for explicit confirmation or a manual Jira step.
- Discover the actual project workflow, issue types, and admin capabilities before proposing changes.
- Do not create workflow or field policy that the active project type cannot support cleanly.
- Keep admin rules strict and execution behavior lightweight.
- Active implementation work must not remain in `To Do` or equivalent backlog state once the assistant has started doing the work.
- Distinguish technical validation from human acceptance. If the workflow supports `User Testing`, treat `QA` as assistant-owned or technically verifiable validation and `User Testing` as the human-owned gate.
- Human-gate precedence is: execution metadata first, labels second, workflow default last. When no issue-specific signal exists, use `User Testing` as the default human gate in workflows that support it, otherwise fall back to `QA`.
- Review is not human-only by default. `QA` is not human-only by default once `User Testing` exists.
- Do not stop at `In Review` or `QA` just because the status name sounds human. Stop there only when the remaining gate actually requires a person, or when Jira exposes no safe assistant-executable move beyond that point.
- In legacy workflows without `User Testing`, treat `QA` as a fallback handoff status, but continue through it when the required validation is still assistant-executable and Jira exposes a real next transition.
- Do not describe work as ready to close unless the content is complete, evidence is sufficient, prior gates are satisfied, dependencies are resolved, and a real `Done` or `Accepted` transition is currently available from the issue's status.
- A bug raised from violated acceptance, failed validation, or readiness mismatch must link directly to each affected issue. Parent epic or capability links are supporting context, never a substitute for direct traceability.
- When the tenant model is unknown, inspect first and only then apply policy.
- If the required Jira change is not safely achievable through the available AI tools or public API, stop and tell the user exactly which manual step is required.
- When publishing project documentation, prefer information architecture that a human can actually navigate and trust.
- Before substantial Confluence documentation work, prefer profiling the target space and understanding the current taxonomy or page roots instead of blindly appending new pages.

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
7. Create or require linked pre-dev test plan issues for every behavior-changing delivery issue.
8. Start the execution loop only after the first issues are ready and quality companions are linked.

## Companion Skills

- `$jira-project-bootstrap`
  Use for creating the first Jira structure from a brief, repo, or kickoff context.
- `$jira-business-analysis`
  Use for bounded discovery, stakeholder-aware requirement shaping, as-is/to-be analysis, and Jira-ready BA handoff.
- `$jira-intake-refinement`
  Use for issue typing, backlog shaping, readiness checks, and intake templates.
- `$jira-quality-control`
  Use as a companion for implementation, repair, bugfix, refactor, and behavior-changing work before coding; also use for validation work, bug evidence, retest loops, and quality fallback planning.
- `$jira-documentation-publishing`
  Use for repo-first project documentation publishing into Confluence.
- `$jira-execution-loop`
  Use for next issue selection, status movement, delivery updates, handoff, and closure.
- `$jira-workflow-admin`
  Use for workflow design, status semantics, screen and field policy, and migration-safe admin changes.

## References

Load these when the decision is unclear or the tenant model matters:
- `references/tenant-modes.md`
- `references/operating-model.md`
