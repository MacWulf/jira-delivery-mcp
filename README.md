# Jira Delivery MCP

`Jira Delivery MCP` is a Jira delivery toolkit built around a local MCP server, explicit policy modules, and an optional Codex skill package.

It is designed for teams that want AI-assisted Jira operations without giving up deterministic tooling, auditable writes, or workflow awareness.

## What It Includes

- an MCP server for Jira and optional Confluence operations
- workflow and dependency policy modules
- project bootstrap and kickoff seeding
- dependency-aware next-issue selection
- execution metadata embedded in Jira issue descriptions
- optional Codex skills for planning, refinement, execution, and workflow administration

## Project Positioning

This repository is not a generic “write anything to Jira” wrapper.

It aims to provide:

- deterministic Jira execution through MCP tools
- explicit workflow, dependency, and readiness logic
- a clean split between operational tooling and higher-level assistant behavior

The MCP server can be useful on its own. The Codex skill package is included as an optional integration layer for teams that use Codex-style skills.

## Repository Structure

```text
docs/                              Product, architecture, and operating documentation
fixtures/                          Reusable project-brief examples
scripts/                           Local helper utilities
services/jira-mcp-server/          MCP server, Jira client, policies, and validation utilities
skills/                            Optional Codex skill package for Jira operations
```

## Documentation

- [Architecture](./docs/architecture.md)
- [Assistant operating model](./docs/assistant-operating-model.md)
- [Capability map](./docs/capability-map.md)
- [Dependency control](./docs/dependency-control.md)
- [Project bootstrap model](./docs/project-bootstrap-model.md)
- [Tool contracts](./docs/tool-contracts.md)
- [Workflow policy](./docs/workflow-policy.md)
- [Secret storage](./docs/secret-storage.md)

## Included Codex Skills

The repository includes a focused Jira skill package for Codex users:

- `jira-core`
- `jira-project-bootstrap`
- `jira-intake-refinement`
- `jira-execution-loop`
- `jira-workflow-admin`

These skills are intentionally tenant-aware:

- they should discover the target project before assuming workflow or issue-type behavior
- they should adapt to different Jira project models where possible
- when an action cannot be completed safely through the available AI tooling or public APIs, they should tell the operator which manual Jira step is required

## Quick Start

1. Copy `.env.example` to `.env`.
2. Fill in your Jira configuration.
3. Install dependencies:

   ```powershell
   npm install
   ```

4. Validate connectivity:

   ```powershell
   npm run smoke
   ```

5. Start the MCP server:

   ```powershell
   npm run dev
   ```

## Common Commands

```powershell
npm run check
npm run build
npm run smoke
npm run dev
```

Additional validation and maintenance commands exist in the workspace, but they are intentionally secondary to the core quick-start path.

## Safety Model

- write operations default to `dry-run`
- live Jira writes require explicit confirmation
- workflow changes should be validated before rollout
- dependency logic is explicit and link-based
- secrets can be stored outside `.env` using platform-native protection such as Windows DPAPI

## Current Focus Areas

- richer quality orchestration and bug evidence flow
- change-request impact analysis
- issue-type enablement across different Jira project models
- better packaging for repeated installation and reuse

## Status

The repository is already usable for local Jira operations and controlled validation flows, but it is still evolving.

Use it as an extensible toolkit rather than a finished, one-size-fits-all product.

## License

This project is licensed under the [MIT License](./LICENSE).
