# Architect Activation Triggers

## Purpose

This document defines when `jira-architect` must activate during Jira delivery.

Architect activation is a hard gate for architecture-impacting work. It is not needed for small local edits that do not affect boundaries, contracts, data flow, deployment, or existing architecture decisions.

## Always Activate

Activate Architect when any condition is true:

- project kickoff or new delivery stream starts
- medium-or-larger refactor is requested
- work crosses module, service, storage, integration, API, authentication, workflow, data-flow, or deployment boundaries
- ADR must be created, updated, superseded, reviewed, or checked for conflict
- existing architecture decision appears contradicted
- implementation needs hard constraints before coding
- low-confidence architecture choice needs bounded spike evidence
- affected Jira work must be blocked or unblocked based on architecture direction
- Confluence architecture pages or ADR taxonomy need sync

## Do Not Activate

Do not activate Architect for:

- typo-only changes
- small local implementation details
- isolated test-only changes without architecture contradiction
- routine Jira status movement
- documentation polish that does not change architecture content
- workflow administration that does not change technical design

## Decision Levels

### Advisory

Use advisory guidance when architecture input is useful but execution is safe to continue.

No Jira blocking is needed.

### Mandatory Gate

Use mandatory gate when affected implementation must not continue until the architecture decision, hard constraints, and Jira/Confluence sync are complete.

Block only affected unresolved work.

### Spike Needed

Use spike-needed when evidence is too weak for a safe architecture decision.

Create bounded spike work and block affected implementation until evidence exists.

## Common Signals

User request signals:

- "new project"
- "refactor"
- "split service"
- "new module"
- "replace legacy"
- "change data flow"
- "new integration"
- "ADR"
- "architecture decision"
- "hard constraint"

Jira signals:

- issue mentions cross-boundary work
- acceptance criteria require architecture constraints
- validation reveals architecture contradiction
- dependency links show affected work cannot proceed safely
- Confluence or ADR link is missing for a required decision

## Blocking Rule

Block every affected unresolved issue when a mandatory gate, ADR conflict, or spike-needed state exists.

Do not block unrelated issues or whole epics when only one child is affected.
