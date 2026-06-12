# Release v0.3.0

## Summary

v0.3.0 prepares Jira Delivery MCP for public GitHub publication and adds the Architect skill as a first-class capability in the bundled Codex skill package.

## Highlights

- Added `jira-architect` skill for architecture decisions, ADR guidance, hard constraints, bounded spikes, proportional blocking, and downstream Jira skill routing.
- Added public Architect documentation for role, activation, ADRs, Jira/Confluence sync, best practices, and release readiness.
- Sanitized public documentation so it does not rely on private Jira or Confluence context.
- Updated repository metadata for `MacWulf/jira-delivery-mcp`.
- Updated package versions to `0.3.0`.

## Validation

Release validation should include:

- tracked-file scan for private URLs, internal issue keys, personal data, secrets, and local absolute paths
- `npm run check`
- `npm run build`
- workspace tests for `@jira-delivery-mcp/jira-mcp-server`
- validation of all bundled skills
- local install sync smoke check for bundled skills

## Notes

The root package remains private to prevent accidental npm registry publication. The intended publication target for this release is GitHub.
