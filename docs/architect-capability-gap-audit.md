# Architect Capability Gap Audit

## Purpose

This public audit explains what the Architect capability adds to the Jira Delivery MCP skill ecosystem.

It is not a private project history. It is a release-facing summary of capability gaps that the `jira-architect` skill is designed to close.

## Covered Gaps

### Architecture Decision Authority

Without Architect, implementation work may proceed without a clear owner for technical direction.

Resolution:

- Architect decides technical direction by default.
- Architect asks the user only for unusually complex, high-risk, or explicitly user-owned decisions.

### ADR Lifecycle

Architecture decisions need durable history, not only transient comments.

Resolution:

- Architect creates or updates ADRs when decisions are durable.
- Supersession is used for material decision changes.
- Rejected alternatives and consequences are preserved.

### Proportional Blocking

Architecture gates can block too much work if applied broadly.

Resolution:

- Architect blocks only unresolved affected work.
- Unrelated issues remain free to proceed.

### Downstream Skill Routing

Architecture decisions often create work owned by other skills.

Resolution:

- Architect routes validation to `jira-quality-control`.
- Architect routes issue shaping to `jira-intake-refinement`.
- Architect routes Confluence mechanics to `jira-documentation-publishing`.
- Architect routes execution movement to `jira-execution-loop`.

### Public Release Portability

Skills must work when installed on another machine.

Resolution:

- `jira-architect` ships all required skill guidance inside the skill folder.
- Public skill files do not depend on private discovery docs, tenant URLs, or local machine paths.

## Release Readiness Signals

Architect capability is release-ready when:

- skill validation passes
- bundled references are self-contained
- public docs contain no private tenant details
- README explains the skill and release scope
- build, check, and tests pass
- public repository metadata points at the intended GitHub repository
