# Local Skill Validation

This guide explains how to validate the Jira skill package locally in a controlled order.

## Prerequisites

- install dependencies with `npm install`
- configure Jira credentials
- store secrets securely when possible
- set at least:
  - `JIRA_BASE_URL`
  - `JIRA_EMAIL`
  - `JIRA_API_TOKEN_DPAPI_FILE` or `JIRA_API_TOKEN`
  - `JIRA_DEFAULT_PROJECT_KEY`
  - `JIRA_VALIDATION_PROJECT_KEY` for controlled live-write checks

## Available Skills

- `jira-core`: routing and tenant-aware baseline behavior
- `jira-project-bootstrap`: project bootstrap from a brief
- `jira-intake-refinement`: issue typing, splitting, and readiness
- `jira-execution-loop`: daily delivery execution
- `jira-workflow-admin`: workflow and status governance

## Skill Metadata in Jira Issues

If the issue description contains an execution metadata block, the assistant should resolve it before execution.

See [Jira issue skill metadata](./jira-issue-skill-metadata.md) for the format.

## Recommended Validation Sequence

1. Confirm connectivity with `npm run smoke`.
2. Try bootstrap behavior in `dry-run` mode.
3. Validate backlog refinement against a real brief.
4. Validate execution behavior on an open issue.
5. Use live-write validation only in a dedicated validation project.
6. Only run live writes against a production delivery project after the flow is stable.

## Prompt Examples

### Bootstrap Dry Run

```text
Use the $jira-project-bootstrap skill. I have a new project brief and want a Jira structure and starter backlog. Start in dry-run mode and suggest the first delivery slice.
```

### Backlog Refinement

```text
Use the $jira-intake-refinement skill. Clean up this backlog, classify the items, split oversized work, and tell me what is not ready yet.
```

### Execution Loop

```text
Use the $jira-execution-loop skill. Pick the next unblocked ticket, resolve the valid transitions, and guide it through a clean delivery loop with comments and the correct handoff.
```

### Workflow Administration

```text
Use the $jira-workflow-admin skill. Review the current project workflow and suggest tenant-aware status, transition, or field-policy improvements where needed.
```

### Project Bootstrap

```text
Use the $jira-core and $jira-project-bootstrap skills. Build a minimal but usable Jira starting structure from a project brief and seed only enough work to start safely.
```

## Safe Progression

- Start in `dry-run`.
- Read before writing.
- Use a dedicated validation project for live checks.
- Discover real Jira transitions before changing status.
- Only move work to `Done` when it is actually complete.

## Quick Metadata Validation

If you specifically want to validate round-trip skill metadata behavior, run:

`npm run validate:skill-metadata`
