# Bootstrap Inputs

Use this reference when turning a project brief into a Jira starting point.

## Required Inputs

- Project goal
- Target audience or stakeholder
- Delivery mode: `kanban` or `scrum`
- Tenant mode: `team-managed` or `company-managed`
- Project name and key
- Known constraints, deadlines, and dependencies
- Known architecture boundaries, integrations, data flows, or ADR constraints when they already exist

## Good Brief Signals

- Clear outcome
- Narrow enough first delivery slice
- Known owner or sponsor
- Enough context to name the first epics and stories

## Missing Inputs

If the brief is vague, ask for:

- what success looks like
- what should ship first
- what must not be in scope
- whether any architecture decision, integration boundary, or medium refactor risk is already known
- whether the project should follow team-managed or company-managed conventions

## Bootstrap Rule

Do not seed Jira until the brief can support a sensible epic structure and a first delivery slice.
Do not treat kickoff implementation as ready until `jira-architect` has decided the minimum architecture foundation or created bounded spike work for unresolved architecture risk.
