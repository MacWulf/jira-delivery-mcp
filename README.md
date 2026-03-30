# Jira MCP and Skills

`Jira MCP and Skills` is a Codex-oriented Jira automation workspace that combines:

- a local MCP server for deterministic Jira and Confluence operations
- a skill package for project bootstrap, refinement, execution, and workflow administration
- a policy layer for safer live writes, dependency-aware execution, and workflow rollout

The goal is not just to "write to Jira", but to let an AI assistant operate Jira in a controlled, auditable, project-aware way.

## What This Project Does

This workspace is designed for teams that want Codex to help run delivery work inside Jira with real operational discipline.

Core capabilities already implemented include:

- Jira issue creation, update, linking, commenting, and worklog support
- next-issue selection with dependency-aware prioritization
- workflow discovery from the actual target project
- skill metadata embedded in Jira issues and resolved during execution
- project bootstrap and kickoff backlog seeding
- dependency drift analysis and relink hygiene
- team-managed workflow validation and live application
- DPAPI-backed local secret handling on Windows

## Why It Exists

Most Jira automations are either too shallow or too brittle:

- simple automation rules can move fields and statuses, but they do not understand delivery logic
- generic AI agents can reason about work, but often lack deterministic Jira control
- admin-heavy Jira customization can become unsafe if the assistant does not understand tenant limits

This project sits in the middle:

- reasoning stays in skills and operating policy
- execution goes through controlled MCP tools and Jira REST APIs
- risky actions are validated, documented, and separated from normal delivery flows

## Project Structure

```text
docs/                              Documentation and operating policy
fixtures/                          Sample briefs and local testing inputs
scripts/                           Helper scripts, including Windows secret storage
services/jira-mcp-server/          MCP server, Jira API client, tools, and live validation scripts
```

Important documents:

- [Architecture](./docs/architecture.md)
- [Assistant operating model](./docs/assistant-operating-model.md)
- [Capability map](./docs/capability-map.md)
- [Product backlog](./docs/product-backlog.md)
- [Workflow policy](./docs/workflow-policy.md)
- [Dependency control](./docs/dependency-control.md)
- [Tool contracts](./docs/tool-contracts.md)

## Skills Included

The local skill package under `C:\Users\User\.codex\skills` currently contains:

- `jira-core`
- `jira-project-bootstrap`
- `jira-intake-refinement`
- `jira-execution-loop`
- `jira-workflow-admin`

These skills are intentionally tenant-aware:

- they should discover the current Jira situation before assuming workflow or issue type behavior
- they should adapt to team-managed vs company-managed constraints
- if a requested action is not safely possible through the available AI tools or public APIs, they should tell the user which manual Jira step is required

## Current Workflow Direction

This project no longer treats workflow as a hardcoded assumption inside the skill layer.

The implemented operating direction is:

1. discover the active project workflow
2. decide whether adaptation or migration is needed
3. validate workflow changes before publishing
4. use the actual Jira transitions during day-to-day execution

For the current `KAN` development project, a controlled live rollout was applied for a stronger delivery lifecycle:

`To Do -> Selected -> In Progress -> Blocked -> In Review -> QA -> Done`

That rollout is treated as project reality, not as a universal rule for every future Jira project.

## Safety Model

This workspace is built around explicit guardrails:

- write operations default to `dry-run`
- live Jira writes require `JIRA_EXECUTION_MODE=live`
- high-impact operations require explicit confirmation
- workflow changes are validated before rollout
- dependency logic is explicit and link-based
- secrets can be stored outside `.env` with DPAPI-backed local protection

## Quick Start

1. Copy `.env.example` to `.env`.
2. Configure Jira credentials and project keys.
3. Install dependencies:

   ```powershell
   npm install
   ```

4. Run a connection check:

   ```powershell
   npm run smoke
   ```

5. Start the MCP server locally:

   ```powershell
   npm run dev
   ```

## Useful Commands

```powershell
npm run check
npm run build
npm run smoke
npm run live-test
npm run skill-metadata-live-test
npm run skill-metadata-demo-live-test
npm run capability-roadmap-live-seed
npm run dependency-control-live-test
npm run workflow-admin-live-apply
```

## Recommended Tenant Setup

This workspace currently assumes a practical separation between:

- `KAN` as the main development project
- `TEST` as the controlled live validation project

That separation helps keep exploratory and validation traffic out of the main delivery backlog.

## Secret Storage on Windows

If you are running locally on Windows, the recommended approach is DPAPI-backed storage instead of putting the Jira API token directly in `.env`.

Store the token with:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\store-dpapi-secret.ps1 -Path "$env:APPDATA\Codex\secrets\jira-api-token.dpapi" -FromClipboard
```

Then point `.env` to:

```text
JIRA_API_TOKEN_DPAPI_FILE=%APPDATA%\Codex\secrets\jira-api-token.dpapi
```

See [Secret storage](./docs/secret-storage.md) for details.

## Status

The workspace is already usable for local Jira operations and live validated workflow changes, but it is still an evolving project.

High-value next areas include:

- test orchestration and bug evidence flow
- change request impact analysis
- issue type enablement strategy across team-managed and company-managed projects
- publishing and packaging the MCP server more cleanly for repeated use

## Naming

Working repository name:

- `jira-mcp-and-skills`

If a slightly more product-like name is preferred later, good alternatives would be:

- `jira-delivery-mcp`
- `codex-jira-operator`
- `jira-project-ops`
