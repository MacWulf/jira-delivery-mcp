# Confluence Publishing

This document defines the Confluence publish-first operating model for the project and the Confluence governance planning layer that sits beside it.

## Intent

- Keep the repository as the documentation source of truth.
- Use Confluence as a structured publishing and navigation surface.
- Support project-documentation publishing first, not full Confluence governance automation.

## Supported publish-first document types

- `kickoff-summary`
- `project-status-update`
- `implementation-note`

Each published page should contain:

- a deterministic title
- deterministic labels
- a review-needed marker
- Jira issue references when relevant
- repo artifact references when relevant

## Publishing policy

- Search before creating new Confluence pages.
- Treat `spaceId + title + parentId` as the primary page identity.
- If exactly one page matches, update it.
- If no page matches, create it.
- If multiple pages match, stop and require a manual cleanup step.

## Governance planning layer

The current project also supports read-only governance planning for Confluence. This layer is intentionally planning-only and admin-safe.

It can:

- profile a target Confluence space
- plan template, content-status, and restriction governance for supported document types
- analyze page staleness using page age, labels, title conformance, and body markers
- recommend remediation actions such as `review`, `archive-candidate`, `metadata-fix`, and `manual-admin-step`
- plan structured metadata expectations and recommended index pages

It does not:

- change native Confluence content status
- apply restrictions automatically
- create native Confluence templates or blueprints
- write content properties or analytics dashboards automatically

When those features are required, the governance layer must return explicit manual admin guidance instead of pretending the automation exists.

## Still out of scope for direct automation

The current Confluence publishing and governance layers do not automate:

- content status administration
- permissions or page restrictions
- native template or blueprint administration
- analytics dashboards
- stale-content remediation writes
- archive and trash lifecycle
