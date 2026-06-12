# ADR Sync Contract

Use this reference when architecture output must become durable knowledge.

## Confluence First

Create or update the Confluence ADR or architecture page before Jira is considered synced.

Use existing architecture pages when the decision is incremental. Create a new ADR only when a durable new decision exists.

## Required ADR Sections

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
- source repo paths when relevant

## Contradiction Check

Before creating a new decision:

- inspect existing ADRs and architecture pages
- update existing ADR when change is incremental
- supersede older ADR only when a genuine replacement decision exists
- block affected work if unresolved conflict remains

## Jira Sync

Every affected Jira issue must receive:

- ADR or architecture page link
- short decision summary
- decision level
- affected scope
- hard constraints
- rejected alternatives when relevant
- confidence or review mode
- cleanup, debt, or migration obligations
- next-skill routing when follow-up belongs to another skill

Do not block unrelated issues.
