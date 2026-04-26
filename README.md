# Jira Delivery MCP

`Jira Delivery MCP` is a Jira operations toolkit centered around a local MCP server, reusable policy modules, and an optional Codex skill package.

It is built for teams that want AI-assisted Jira execution without losing deterministic tooling, workflow awareness, or auditability.

## Who It Is For

Use this project if you want an assistant to help with Jira work such as:

- creating and updating issues safely
- linking blockers and dependencies explicitly
- discovering the real workflow of a target project before acting
- selecting the next eligible issue instead of guessing
- bootstrapping a new project from a brief
- layering Codex skills on top of a deterministic Jira tool surface

## What You Can Do Today

- run a local MCP server for Jira and optional Confluence operations
- publish repo-first project documentation into Confluence with duplicate-aware upsert behavior
- plan Confluence governance, staleness review, metadata policy, and documentation index structure without unsafe admin writes
- create, update, transition, comment on, and link Jira issues
- inspect project workflow and derive lifecycle semantics from the real tenant
- discover issue-type and field-policy capability before attempting admin changes
- bootstrap starter backlog structure from a project brief
- generate validation work from acceptance criteria with tenant-aware fallback
- create bugs with structured evidence and linked parent impact
- classify incoming change scope and plan controlled Jira mutations with audit-ready outputs
- plan retest loops without hardcoding a workflow or status set
- store execution metadata in issue descriptions and resolve it during execution
- validate dependency state before picking or starting work

## Quick Example

Typical flow:

1. Start the MCP server.
2. Read a target project and discover its workflow.
3. Create or refine starter issues from a brief.
4. Link blockers with explicit Jira issue links.
5. Pick the next eligible issue.
6. Transition it using a Jira-provided transition, not a hardcoded assumption.

## Compatibility

| Area | Status | Notes |
| --- | --- | --- |
| Jira Cloud | Supported | Current implementation targets Jira Cloud REST APIs |
| Confluence integration | Optional | Only active when Confluence config is present |
| Team-managed projects | Supported | Discovery and execution are tenant-aware |
| Company-managed projects | Supported | Admin behavior is more sensitive and should be validated carefully |
| Workflow mutation | Supported with caution | Validate before rollout; treat as high-impact admin work |
| Codex skills | Optional integration | Useful, but not required to run the MCP server |
| Windows DPAPI secrets | Supported | Recommended Windows local-secret option |

## Installation

1. Copy `.env.example` to `.env`.
2. Fill in your Jira configuration.
3. Install dependencies:

   ```powershell
   npm install
   ```

## Configuration

Minimum Jira configuration:

- `JIRA_BASE_URL`
- `JIRA_EMAIL`
- `JIRA_API_TOKEN` or `JIRA_API_TOKEN_DPAPI_FILE`

Optional but useful:

- `JIRA_DEFAULT_PROJECT_KEY`
- `CONFLUENCE_BASE_URL`
- `CONFLUENCE_EMAIL`
- `CONFLUENCE_API_TOKEN` or `CONFLUENCE_API_TOKEN_DPAPI_FILE`
- `CONFLUENCE_DEFAULT_SPACE_ID`

See [Secret storage](./docs/secret-storage.md) for local secret-handling guidance.

## Quick Start

Validate connectivity:

```powershell
npm run smoke
```

Start the MCP server:

```powershell
npm run dev
```

Validate the workspace:

```powershell
npm run check
npm run build
```

## Common Commands

```powershell
npm run check
npm run build
npm run smoke
npm run dev
```

## Codex Skills

The repository also includes an optional Codex skill package under [`skills/`](./skills):

- `jira-core`
- `jira-business-analysis`
- `jira-project-bootstrap`
- `jira-intake-refinement`
- `jira-quality-control`
- `jira-documentation-publishing`
- `jira-execution-loop`
- `jira-workflow-admin`

These skills are designed to stay tenant-aware:

- they should inspect the target project before assuming workflow or issue-type behavior
- they should adapt to different Jira project models where possible
- when a requested action cannot be completed safely through the available AI tooling or public APIs, they should tell the operator which manual Jira step is required

To install the latest local Jira skill package and register the built MCP server in your Codex environment, run:

```powershell
.\scripts\install-codex-local.ps1
```

This script:

- runs `npm run build`
- syncs the Jira skills from [`skills/`](./skills) into `~/.codex/skills`
- updates `~/.codex/config.toml` with a local `jiraDelivery` stdio MCP server that points to the built `services/jira-mcp-server/dist/index.js`

Re-run it whenever you want the local Codex install to pick up new MCP or skill changes from this repository.

## Repository Structure

```text
docs/                              Product and architecture documentation
fixtures/                          Reusable project-brief examples
scripts/                           Local helper utilities
services/jira-mcp-server/          MCP server, Jira client, policies, and tools
skills/                            Optional Codex skill package
```

## Documentation

Start here:

- [Architecture](./docs/architecture.md)
- [Tool contracts](./docs/tool-contracts.md)
- [Workflow policy](./docs/workflow-policy.md)
- [Readiness policy](./docs/readiness-policy.md)
- [Quality governance](./docs/quality-governance.md)
- [Change control](./docs/change-control.md)
- [Confluence publishing](./docs/confluence-publishing.md)
- [Project bootstrap model](./docs/project-bootstrap-model.md)
- [Dependency control](./docs/dependency-control.md)
- [Secret storage](./docs/secret-storage.md)

Additional references:
- [Project brief template](./fixtures/project-brief-template.md)
- [Sample project brief](./fixtures/sample-project-brief.md)

## Security

- daily Jira and Confluence delivery writes execute live by default
- only admin-risk writes require explicit confirmation
- explicit preview mode is still available through `JIRA_EXECUTION_MODE=dry-run`
- workflow changes should be validated before rollout
- dependency logic is explicit and link-based
- secrets should not be committed to the repository

## Roadmap

Current focus areas include:

- richer quality orchestration and bug evidence flow
- change-request impact analysis
- issue-type enablement across different Jira project models
- better packaging for repeated installation and reuse

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

This project is licensed under the [MIT License](./LICENSE).
