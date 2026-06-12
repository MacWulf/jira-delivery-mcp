# Architect Jira And Confluence Sync

## Purpose

This document defines how architecture decisions stay synchronized across Jira, Confluence, and available project sources.

The goal is traceability without turning every issue comment into a long architecture document.

## Source Of Truth

Use this order:

1. Confluence architecture page or ADR when available.
2. Repository or project documentation when it is part of the current project.
3. Jira issue summary fields and comments for execution-facing context.

Jira is the delivery control plane. Confluence is the human-readable architecture surface.

## Minimum Jira Sync

Every affected Jira issue must receive:

- ADR or architecture page link when available
- short decision summary
- decision level
- affected scope
- hard constraints
- rejected alternatives when relevant
- confidence or review mode
- cleanup, debt, or migration obligations
- next-skill routing when follow-up belongs elsewhere

## Confluence First

When a durable ADR is required, create or update the Confluence page before treating Jira sync as complete.

Use an existing architecture page when the change is incremental. Create a new ADR only when a durable new decision exists.

## Affected Scope

Sync only affected work.

Do not block or rewrite unrelated issues.

Parent epics should be updated only when the architecture decision changes the parent meaning, schedule, or acceptance state.

## Blocking Sync

Apply blocking state when:

- mandatory gate is unresolved
- ADR conflict is unresolved
- spike evidence is required before implementation

Remove or bypass blocking only when the architecture condition is actually resolved.

## Downstream Routing

Architect routes follow-up work to existing skills:

- BA questions to `jira-business-analysis`
- issue shaping to `jira-intake-refinement`
- validation to `jira-quality-control`
- publication mechanics to `jira-documentation-publishing`
- status movement to `jira-execution-loop`
- workflow or field policy to `jira-workflow-admin`

Architect keeps decision ownership while other skills perform their operating tasks.
