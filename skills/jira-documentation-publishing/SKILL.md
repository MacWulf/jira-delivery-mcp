---
name: jira-documentation-publishing
description: Use when the task is about publishing repo-first project documentation into Confluence or planning Confluence governance in an admin-safe way. When the documentation is an architecture decision, ADR, architecture taxonomy, hard constraint, rejected alternative, or affected-work summary, use jira-architect for the decision and content contract, then handle Confluence publishing mechanics here.
---

# Jira Documentation Publishing

## Overview

Use this skill when project documentation needs to be published into Confluence without turning Confluence into the primary source of truth, or when Confluence governance needs to be planned without pretending unsupported admin automation exists. This skill keeps documentation publishing separate from Jira execution and administration so the assistant can preserve repo-first traceability and produce documentation that is genuinely understandable for human readers.

## When To Use

Use this skill when the user asks to:
- publish kickoff documentation to Confluence
- create or refresh a project summary or status page
- sync implementation notes from Jira and repo artifacts into Confluence
- avoid duplicate Confluence pages before creating new documentation
- keep Jira issues and repo paths linked in published documentation
- build or improve a human-readable Confluence documentation structure for the project
- document what each skill or the MCP server does in reality
- profile a Confluence space before governance work
- plan template, content-status, restriction, metadata, or index-page behavior for repo-first docs
- analyze stale or broken-contract project-doc pages
- explain what manual Confluence admin step is needed when the requested publishing or governance flow cannot be completed safely

If the request is really about Confluence permissions, templates, content status administration, or analytics governance, keep the behavior admin-safe: plan and explain, do not claim the current project can enforce those native Confluence settings automatically.

## Human-First Quality Bar

Confluence output should be usable by a human operator, not only technically valid.

When publishing a meaningful project documentation set:

1. Create a real landing page.
   The space should have a front door that tells a human where to start.
2. Separate landing pages from deep-reference pages.
   Overview pages should not try to do the job of subsystem reference pages.
3. Give major concepts their own pages.
   If the project uses multiple skills or an MCP server, each major capability should get its own dedicated explanation page when the documentation set is broad enough.
4. Prefer human-readable structure over raw repo export.
   Tool-generated pages are a starting point, not always the final result.
5. Keep the space honest.
   If something is only planned, say so. If something is manual, say so. If something is automated, explain what really happens.
6. Prefer meaningful page anatomy.
   Durable pages should usually explain:
   - what the page is for
   - who owns it and what state it is in
   - who should read it
   - what the system does in practice
   - what it does not do
   - related pages
   - source references
7. Use hierarchy deliberately.
   The page tree should reflect reading paths, not only creation order.
8. Distinguish page families clearly.
   Policy, architecture, operator guidance, status reporting, implementation evidence, and reference pages should not all read like the same template.
9. Avoid placeholder polish.
   If a page still feels skeletal or machine-generated after the first publish, enrich it before treating it as finished documentation.

## Space Architecture Standard

For a professional project space, prefer this model:

1. A landing page that explains purpose, scope, and where to start.
2. A small number of orientation pages.
3. Dedicated deep-reference pages for major subsystems such as each skill and the MCP server.
4. Intentional parent-child placement.
5. A visible distinction between active documentation and stale or historical leftovers.

Do not treat the page tree as a side effect of publishing order.

## Metadata And Trust Standard

For durable project pages, prefer visible metadata in the page body even when native Confluence metadata is not automated:

- document status
- owner
- review cadence or next review
- as-of or last reviewed date where relevant
- source of truth
- linked Jira scope when relevant
- sensitivity or access classification when governance matters

If the tooling cannot enforce these through native Confluence features, the assistant should still surface them in human-readable form.

## Document Lifecycle Standard

Documentation lifecycle should be distinct from Jira issue lifecycle.

Prefer human-facing documentation states such as:

- Draft
- In review
- Active
- Deprecated
- Archived

Do not leave long-lived pages in a vague permanent `review needed` state once the page is supposed to be part of the real documentation set.

## Working Modes

### Publishing mode

1. Treat the repository as the source of truth.
   Publish from repo and Jira evidence. Do not invent a Confluence-only truth model.
2. Resolve the target document type first.
   Use `kickoff-summary`, `project-status-update`, or `implementation-note` before writing.
   For ADR or architecture decision content, use `$jira-architect` first to decide status, hard constraints, rejected alternatives, affected scope, review mode, and Jira sync expectations.
3. Search before creating.
   Use the duplicate-aware page identity flow so the assistant does not create parallel pages for the same document.
4. Preserve traceability.
   Include Jira issue references and repo artifact references in the published page.
5. Prefer deterministic publishing tools.
   Use `plan_project_doc_page` and `ensure_project_doc_page` before dropping to lower-level page write tools.
6. Resolve the document family and parent placement deliberately.
   Decide whether the page is an overview, status page, architecture note, policy page, operator guide, or deep reference page, and place it under the correct parent instead of relying on a flat page list.
7. Add a trust header when the page is durable.
   Make it obvious what generated the page, what sources were used, what the source of truth is, and whether there are manual/admin gaps.
8. Curate for readability after publish when needed.
   If the first publish creates a structurally correct but thin page, follow up with richer human-facing content, better navigation, or dedicated child pages.
9. Escalate admin gaps honestly.
   If the user is really asking for Confluence template/status/permission automation, explain that this version supports publishing, not full Confluence governance automation.

### Governance planning mode

1. Profile the target space first.
   Use `get_doc_space_profile` before making governance claims about a space.
2. Stay planning-only.
   Use `plan_doc_governance`, `analyze_doc_staleness`, `plan_doc_remediation`, `plan_doc_metadata_policy`, and `plan_doc_index_pages`.
3. Use the repo-first contract as the baseline.
   Governance checks should look for deterministic labels, source references, title prefixes, and body markers before recommending heavier admin work.
4. Make admin gaps explicit.
   If the user asks for native templates, content status, restrictions, content properties, or reporting macros, explain the manual Confluence step instead of inventing unsupported automation.
5. Keep reporting recommendations audit-friendly.
   Prefer deterministic labels and body markers as the current fallback when native Confluence reporting surfaces are unavailable.
6. Use governance to improve trust, not just compliance.
   Good governance should help humans understand page ownership, lifecycle, and navigation instead of only enforcing structure.
7. Treat stale-content as a trust issue.
   Missing owner, overdue review, broken taxonomy, or absent source references are all real documentation health problems, not just cosmetic defects.

## Decision Rules

- Confluence is a publishing target, not the primary documentation system.
- Do not publish blindly when multiple matching pages exist.
- Prefer `ensure_project_doc_page` over direct `create_doc_page` for normal publishing.
- Keep labels and titles deterministic so pages are searchable later.
- Prefer titles and page groupings that make sense to a human reader, not only to the assistant.
- For broad project documentation, create a landing page plus dedicated deep-reference pages instead of one overloaded page.
- If the project exposes multiple skills or services, document them separately when that improves clarity.
- Resolve a canonical page family and intended parent before publishing non-trivial documentation.
- Prefer visible owner/status/review metadata on long-lived pages.
- Use governance planning tools instead of write tools for template, restriction, status, stale-content, and metadata/reporting asks.
- If no target space is available, ask for `spaceId` or require `CONFLUENCE_DEFAULT_SPACE_ID`.
- Normal documentation publishing should execute live by default when Confluence is configured. If publishing is unavailable, explain the missing configuration or the manual step instead of treating it as a hidden dry-run.
- If Confluence-native governance is required, return manual-step guidance instead of pretending native admin support exists.
- If the current space structure feels like a machine-generated dump, improve the information architecture before calling the documentation finished.
- If outdated or orphaned pages remain in the primary navigation path, surface them as cleanup work instead of ignoring them.
- Do not decide architecture inside this skill. For ADR content and architecture constraints, use `$jira-architect`; this skill owns publishing mechanics and Confluence governance behavior.

## Companion Skills

- `$jira-core`
  Use for routing and mixed Jira/Confluence flows.
- `$jira-architect`
  Use for ADR decisions, architecture page contracts, rejected alternatives, hard constraints, affected Jira summaries, and proportional blocking rules before publishing.
- `$jira-project-bootstrap`
  Use when project kickoff docs should follow bootstrap work.
- `$jira-execution-loop`
  Use when documentation is part of active delivery progress and the Jira issue also needs state movement.
- `$jira-workflow-admin`
  Use the same admin-safe mindset when the user asks for Confluence governance, restrictions, or structured policy changes that cross into administrator territory.

## References

Load these when the publishing path is unclear:
- `references/repo-first-publishing.md`
- `references/doc-types.md`
- `references/human-first-confluence.md`
