# Architect ADR Template Spec

## Purpose

This document defines the durable architecture decision record expected from `jira-architect`.

ADR output should be short, decision-centered, and traceable. Confluence is the human-readable decision surface when available. Jira carries links, summaries, affected-work state, and execution constraints.

## When ADR Is Required

Create or update an ADR when:

- a project kickoff establishes architecture direction
- medium-or-larger refactor changes boundaries
- service, module, storage, API, integration, auth, workflow, deployment, or data-flow ownership changes
- a hard constraint is needed before implementation
- an existing decision is contradicted
- a legacy replacement or migration path is chosen
- an architecture spike resolves uncertainty

Do not create an ADR for small local implementation details.

## Required Sections

An ADR or architecture decision page must include:

- status
- context
- decision
- hard constraints
- affected Jira issues
- affected Confluence pages
- rejected alternatives with short reasons
- consequences
- follow-up cleanup or debt
- validation expectations
- review mode
- source project paths when relevant

## Status Values

Use clear status values:

- proposed
- accepted
- superseded
- deprecated

Do not silently rewrite decision history. Supersede material changes and link the new decision to the old decision when possible.

## Decision Levels

### Advisory

Useful guidance. Execution may continue.

### Mandatory Gate

Implementation must wait until the decision, hard constraints, and affected-work sync are complete.

### Spike Needed

Implementation waits for bounded evidence before the decision can be accepted.

## Hard Constraints

Hard constraints must be enforceable statements, for example:

- "Only service A may write data store B."
- "Module X must not import module Y."
- "External callbacks must verify signature Z."
- "All new endpoints must emit trace field Q."

Avoid vague guidance such as "try to keep it clean" or "consider security."

## Rejected Alternatives

List rejected alternatives briefly:

- alternative
- reason rejected

Reasons should name the meaningful tradeoff, such as security risk, coupling, operational burden, migration risk, or cost.

## Validation Expectations

Each ADR must say what downstream validation should prove.

Route test planning and validation to `jira-quality-control`.
