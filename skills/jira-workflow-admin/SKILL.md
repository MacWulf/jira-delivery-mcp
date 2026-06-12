---
name: jira-workflow-admin
description: Use when the task is to design or change Jira workflows, statuses, schemes, screens, or field policy. This skill governs admin-safe workflow work and avoids blind edits on live projects. When workflow or field changes are driven by architecture decision gates, ADR metadata, proportional blocking, or hard constraint policy, use jira-architect for the architecture decision before admin design.
---

# Jira Workflow Admin

## Overview

Use this skill for Jira administration work that changes how projects behave. It covers workflow discovery, status semantics, required field policy, and migration-safe rollout planning.

## When To Use

Use this skill when the user asks to:
- create or change Jira workflow states and transitions
- standardize multiple projects around a shared delivery model
- decide which fields must be required at which stage
- adjust workflow schemes, screen policy, or field configuration
- migrate a project from a weak process to a stronger one
- investigate why workflow-state reconciliation cannot find a safe path because the project workflow itself is missing required states or transitions

Do not use this skill for ordinary issue movement. That belongs in `$jira-execution-loop`.

## Admin Workflow

1. Discover the current shape.
   Inspect project type, workflow model, issue types, statuses, screens, required fields, transition behavior, and what the current tool or public API surface can really modify.
2. Determine the blast radius.
   Identify whether the change is isolated to one project or shared across multiple projects.
3. Design the target operating model.
   Define each status by business meaning, not by habit. Clarify what can enter and leave each status, but do not assume the same lifecycle fits every project.
   If the operating model needs architecture gates, ADR metadata, or proportional blocking policy, use `$jira-architect` for the decision and constraints before admin design.
4. Check tenant compatibility.
   Team-managed and company-managed projects support different governance patterns. Treat this as a routing concern, not as a reason to hardcode a single preferred model into the skill.
5. Plan migration before editing.
   Decide how existing issues move, which statuses map forward, and what documentation must change.
6. Apply the smallest safe change.
   Prefer incremental rollout over full workflow rewrites on live delivery projects. Reuse the project's existing workflow where possible and only add delta when it solves a real delivery problem.
7. Document the policy.
   Record the meaning of statuses, transition rules, required fields, and exceptions.

## Design Rules

- Status names must have distinct meanings.
- Do not create multiple statuses that all really mean "someone is working on it."
- If the workflow includes both `QA` and `User Testing`, keep their meanings distinct: `QA` is assistant-owned or technically verifiable validation, while `User Testing` is the human-owned acceptance gate.
- Required fields should be enforced where they improve quality, not merely to add friction.
- Workflow guidance must adapt to the discovered tenant and project model, not to a baked-in preferred scheme.
- Shared company-managed workflows need stronger change control than isolated team-managed flows.
- Preserve reporting clarity: bugs, stories, and technical work should remain distinguishable.

## Guardrails

- Workflow, scheme, issue-type, field, and other tenant-shaping changes are admin-risk writes. Require explicit confirmation when the runtime confirmation gate is enabled.
- Never rewrite a live workflow blindly.
- Never assume a shared workflow only affects the current project.
- Do not add review or QA states unless ownership for those states is real.
- If human acceptance needs to be visibly distinct from technical validation, prefer a dedicated `User Testing` status instead of overloading `QA`.
- Avoid complex transition logic that the team will not follow consistently.
- If active work cannot leave `To Do` cleanly, treat that as a real workflow or policy defect, not as a harmless reporting issue.
- If workflow-state reconciliation fails because the workflow itself has no safe path for a valid operational state change, treat that as an administrative defect rather than forcing the execution loop to guess.
- If execution-loop helpers report `workflow_admin_required`, treat that as a workflow design defect first, not as an issue-level delivery failure.
- If the project is still exploratory, prefer a simpler workflow and tighten governance later.
- If a desired admin action is not supported through the available AI tools or public API, stop and tell the user the manual Jira step instead of pretending the automation exists.

## References

Load these when changing Jira administration policy:
- `references/company-managed-standard.md`
- `references/team-managed-caveats.md`
