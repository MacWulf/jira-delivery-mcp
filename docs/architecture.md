# Architecture

## Goal

`Jira Delivery MCP` provides a structured way for an AI assistant to operate Jira and, optionally, Confluence through deterministic tools instead of ad-hoc prompting alone.

The project combines:

- an MCP server that exposes safe Jira and Confluence operations
- policy modules that interpret workflow, dependency, and execution rules
- an optional Codex skill package for higher-level planning and delivery behavior

## Core Components

### `services/jira-mcp-server`

Responsibilities:

- expose MCP tools for Jira and Confluence
- validate tool inputs
- execute Jira and Confluence REST calls
- enforce baseline write guardrails

### Policy Layer

Responsibilities:

- map workflow semantics from the target project
- evaluate dependency state before execution
- support issue selection, readiness checks, and lifecycle routing

### Optional Skill Layer

Responsibilities:

- bootstrap a project from a brief
- refine backlog items
- drive daily execution loops
- guide workflow administration in a tenant-aware way

## Request Flow

1. The assistant reads the current project, issue, or brief.
2. It resolves the relevant workflow, dependency, and execution context.
3. It calls MCP tools such as `search_issues`, `transition_issue`, `add_comment`, or `create_doc_page`.
4. The MCP server validates the request and executes the underlying REST calls.
5. Structured results flow back to the assistant for the next decision.

## Why Not Use Search-Only AI Layers

- Search-oriented AI layers are useful for context gathering, but they do not replace deterministic operational tooling.
- Lifecycle control, dependency handling, and safe write behavior need an explicit tool surface.
- Project-specific rules are easier to audit and evolve when they live in dedicated policy modules.

## Guardrails

- `transition_issue` only accepts transitions that Jira reports as valid for that issue.
- `pick_next_issue` never returns completed work.
- `link_issues` requires an explicit link type.
- Confluence writes are only enabled when the required configuration exists.
- Live writes require explicit confirmation.

## Near-Term Extension Points

1. workflow policy discovery per project
2. richer readiness and completion rules
3. audit logging and idempotency
4. approval gates for high-impact changes
5. optional context augmentation from additional Atlassian tooling
