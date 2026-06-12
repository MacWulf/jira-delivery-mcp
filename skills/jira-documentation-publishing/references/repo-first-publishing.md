# Repo-First Publishing

- The repository remains the source of truth for implementation-facing documentation.
- Jira remains the source of truth for work state and issue identity.
- Confluence receives structured published views that point back to repo paths and Jira issues.
- Architecture decisions and ADRs are Confluence-first content owned by `jira-architect`; Jira must receive the ADR link, short summary, hard constraints, and affected-work status after publication.
- If a requested Confluence workflow would make Confluence authoritative or require unsupported admin actions, stop and explain the manual step instead of pretending the tooling can do more than it can.
