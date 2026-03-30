# Capability Map

## Purpose

This document groups the next major Jira assistant capabilities into modules that can be planned, implemented, and operated independently.

The goal is not only to automate Jira CRUD, but to make the assistant behave like a product lead: it should govern workflow, orchestrate quality, handle change, and preserve traceability.

## Modules

### 1. Workflow Governance

Responsibilities:
- discover the current project workflow
- map project-specific statuses and transitions
- create or adjust workflow policy when the project needs it
- keep team-managed and company-managed behavior separate

Why it matters:
- the assistant must not assume a fixed lifecycle
- status semantics change over time as the project matures

Current supporting skills:
- `$jira-core`
- `$jira-workflow-admin`

### 2. Delivery Control

Responsibilities:
- pick the next eligible issue
- validate blockers and dependencies
- start work using real Jira transitions
- hand off and close issues only when ready

Why it matters:
- this is the daily execution loop
- it keeps the board truthful

Current supporting skills:
- `$jira-core`
- `$jira-execution-loop`

### 3. Quality Control

Responsibilities:
- attach test work to user stories or tasks
- verify acceptance criteria
- create bug issues when validation fails
- link bugs back to the parent work item
- attach evidence and reset status when needed

Why it matters:
- the assistant should not mark work as done without evidence
- failed acceptance criteria must become visible, actionable defects

Current supporting skills:
- `$jira-core`
- `$jira-intake-refinement`
- `$jira-execution-loop`

### 4. Dependency Control

Responsibilities:
- discover incoming and outgoing blockers
- keep the dependency graph truthful as the backlog changes
- prevent the assistant from starting blocked work
- surface downstream impact when one issue blocks others

Why it matters:
- dependency drift silently breaks delivery planning
- a truthful next-issue picker needs more than priority

Current supporting skills:
- `$jira-core`
- `$jira-execution-loop`
- `$jira-intake-refinement`

### 5. Change Control

Responsibilities:
- classify new incoming scope as a change request, bug, or new work
- estimate impact on existing issues, dependencies, and release order
- reopen or modify existing tickets when the scope changes
- document the decision trail

Why it matters:
- real projects evolve while they are in motion
- the assistant must handle scope drift explicitly instead of hiding it in comments

Current supporting skills:
- `$jira-core`
- `$jira-intake-refinement`
- `$jira-project-bootstrap`

### 6. Intake and Backlog Health

Responsibilities:
- split large work into startable items
- ensure parents, acceptance criteria, and dependencies exist
- keep duplicate and stale work out of the active queue
- create a small, readable first backlog from a brief

Why it matters:
- good delivery depends on clean intake
- the assistant should not create a noisy backlog just to appear thorough

Current supporting skills:
- `$jira-project-bootstrap`
- `$jira-intake-refinement`

### 7. Traceability and Audit

Responsibilities:
- preserve links between brief, epic, story, task, bug, and test evidence
- keep decision notes and scope changes recoverable later
- make major actions auditable

Why it matters:
- without traceability, the assistant cannot explain why a decision was made
- change requests and quality failures need a durable paper trail

Current supporting skills:
- `$jira-core`
- `$jira-execution-loop`
- `$jira-workflow-admin`

## Related Missing Layers

These are not full modules yet, but they are important enough to keep in scope:
- `Definition of Ready` and `Definition of Done`
- release and environment awareness
- approval gates for high-impact changes
- ownership model for decision making and review
- backlog hygiene and duplicate detection
- exception handling for invalid transitions, missing issue types, and conflicting metadata

## Recommended Implementation Order

1. Workflow Governance
   Get the lifecycle right before automating too much around it.
2. Intake and Backlog Health
   Create clean, startable work items and keep the queue small.
3. Delivery Control
   Make the assistant able to safely start, advance, and close work.
4. Dependency Control
   Keep blockers, sequencing, and downstream impact explicit.
5. Quality Control
   Add tests, evidence, and bug handling once delivery is stable.
6. Change Control
   Teach the assistant how to react when scope shifts mid-project.
7. Traceability and Audit
   Tie everything together with durable decision history and evidence.

## Practical Rule

If a capability changes project behavior, it should be documented before it is automated.
If a capability changes Jira state, it should be auditable.
If a capability can block delivery, it should be explicit.
