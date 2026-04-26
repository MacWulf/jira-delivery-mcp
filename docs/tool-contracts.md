# Tool Contracts

## Core Read Tools

### `list_projects`

- Purpose: list visible Jira projects
- Required input: none
- Output: visible project list
- Guardrail: read-only

### `get_project`

- Purpose: fetch project metadata
- Required input: `projectKey`
- Output: project details
- Guardrail: read-only

### `get_project_admin_snapshot`

- Purpose: fetch an administrative snapshot of the project
- Required input: `projectKey`
- Output: project metadata plus workflow and issue-type context when available
- Guardrail: read-only

### `discover_issue_type_capabilities`

- Purpose: inspect which common issue types are already usable in a target project
- Required input: `projectKey`
- Output: project management model, available issue types, and capability hints for Bug, Task, Story, and Validation/Test-style work
- Guardrail: read-only and tenant-aware

### `plan_issue_type_enablement`

- Purpose: plan how requested issue types should be satisfied in a target project
- Required input: `projectKey`, `requestedIssueTypes`
- Output: per-type capability snapshot covering native availability, creation possibility, fallback type and labels, and manual-step guidance
- Guardrail: read-only planning; does not mutate Jira

### `plan_field_policy`

- Purpose: plan how required fields should be satisfied for a target issue type
- Required input: `projectKey`, `issueTypeName`, `requiredFields`
- Output: issue-type capability, field availability snapshot, fallback strategy, and manual-step guidance
- Guardrail: read-only planning and based on create-surface discovery when available

### `plan_bug_triage`

- Purpose: classify a bug report into explicit triage outcomes without mutating Jira
- Required input: `summary`
- Output: triage outcome, missing required context, labels, and recommended actions
- Guardrail: read-only and designed to keep need-info, duplicate, rejected, and non-repro outcomes explicit

### `plan_quality_queues`

- Purpose: recommend tenant-aware quality queues, filters, and automation guidance
- Required input: `projectKey`
- Output: queue recommendations, suggested JQL, automation recommendations, and tenant notes
- Guardrail: read-only planning; recommends the smallest viable mechanism for the target tenant

### `classify_incoming_change`

- Purpose: classify an incoming change as `change_request`, `bug`, `reopen`, `new_scope`, or `ambiguous`
- Required input: `summary`
- Output: classification, confidence, reasons, decision points, and optional issue context
- Guardrail: read-only and explicitly stops with a decision point when the change remains ambiguous

### `analyze_change_impact`

- Purpose: analyze affected issues, dependency edges, reopen/split pressure, and release-order risk for an incoming change
- Required input: `summary` plus `issueKey` or `relatedIssueKeys`
- Output: affected issues, dependency edges, release risk, and recommendations
- Guardrail: read-only planning; impact analysis is intended to precede live Jira mutation and stays explicit when the change remains ambiguous

### `plan_change_execution`

- Purpose: turn a classified change into explicit Jira operations, decision-log payload, and approval-gate guidance
- Required input: `issueKey`, `summary`
- Output: impact analysis, ordered Jira operations, decision log, approval gate, and audit notes
- Guardrail: read-only planning; high-impact cases stop for approval instead of inventing blind automation

### `plan_change_decision_log`

- Purpose: build a concise decision-log entry for change-control work
- Required input: `issueKey`, `summary`
- Output: title, summary, affected issue keys, detail lines, and comment-ready body
- Guardrail: planning-only and intentionally concise so the audit trace stays readable

### `evaluate_change_approval`

- Purpose: determine whether a planned change must stop behind an explicit approval gate
- Required input: `issueKey`, `summary`
- Output: approval-required flag, risk level, reasons, and the planned operations considered
- Guardrail: planning-only and explicit about why high-impact changes should not be applied blindly

### `list_workflow_schemes`

- Purpose: list visible workflow schemes
- Required input: none
- Output: workflow scheme list
- Guardrail: read-only

### `discover_project_workflow`

- Purpose: capture a workflow discovery snapshot with statuses, sampled transitions, and semantic hints
- Required input: `projectKey`
- Output: management model, issue-type and status snapshot, sampled transitions, policy hints
- Guardrail: read-only and based on the actual tenant state

### `evaluate_issue_readiness`

- Purpose: evaluate whether an issue is ready for selection, start, handoff, or closure
- Required input: `issueKey`
- Output: readiness kind, acceptance-criteria signal, blocker snapshot, and pass/fail checks
- Guardrail: read-only and based on the actual issue content

### `plan_issue_state_reconciliation`

- Purpose: inspect a Jira issue and plan how its workflow state should be aligned with its actual delivery state
- Required input: `issueKey`
- Output: current semantic, inferred target semantic, path, risk, confirmation requirement, and manual-step guidance
- Guardrail: read-only planning; does not mutate Jira

### `preview_standard_project_workflow`

- Purpose: preview a reusable delivery workflow delta and validation result
- Required input: `projectKey`
- Output: target statuses, workflow update payload, validation result
- Guardrail: read-only, does not publish workflow changes

### `analyze_dependency_drift`

- Purpose: audit dependency drift, duplicate edges, stale-link candidates, and expected-versus-actual dependency differences
- Required input: `projectKey` or `jql`
- Output: missing dependencies, unexpected dependencies, duplicate edges, stale candidates, blocked-state conflicts
- Guardrail: read-only

### `get_issue`

- Purpose: fetch issue details
- Required input: `issueKey`
- Output: issue fields, status, execution metadata, dependency snapshot, dependency-impact summary, status signals
- Guardrail: read-only

### `search_issues`

- Purpose: query issues with JQL
- Required input: `jql`
- Output: issue list with selected fields
- Guardrail: bounded by `maxResults`

### `get_transitions`

- Purpose: fetch valid status transitions for an issue
- Required input: `issueKey`
- Output: transition list with names and IDs
- Guardrail: always queries Jira directly

### `get_issue_link_types`

- Purpose: list available issue-link types
- Required input: none
- Output: link-type list
- Guardrail: read-only

### `evaluate_write_policy`

- Purpose: explain whether a supported write would execute live, require admin confirmation, or stay in explicit preview mode
- Required input: `operation`
- Output: operation, risk tier, runtime mode, confirmation requirement, and live-write allowance
- Guardrail: read-only helper; does not mutate Jira or Confluence

## Core Write Tools

### `bootstrap_project_from_template`

- Purpose: create a new Jira project from an explicit template
- Required input: `key`, `name`, `projectTypeKey`, `projectTemplateKey`
- Output: created project metadata or a preview payload when explicit dry-run mode is enabled
- Guardrail: project creation is admin-risk and requires explicit confirmation when confirmation gates are enabled

### `bootstrap_software_project`

- Purpose: create a software project from higher-level delivery choices
- Required input: `key`, `name`
- Output: created project metadata or a preview payload when explicit dry-run mode is enabled
- Guardrail: project creation is admin-risk and requires explicit confirmation when confirmation gates are enabled

### `create_issue`

- Purpose: create a new Jira issue
- Required input: `summary`, `issueType`
- Output: created issue key and URL
- Guardrail: without an explicit project key, falls back to the configured default project

### `update_issue`

- Purpose: update fields on an existing issue
- Required input: `issueKey`
- Output: update confirmation
- Guardrail: only explicit field updates are applied

### `transition_issue`

- Purpose: transition an issue by Jira transition ID
- Required input: `issueKey`, `transitionId`
- Output: transition confirmation
- Guardrail: only a Jira-reported transition ID may be used

### `transition_issue_by_name`

- Purpose: transition an issue by human-readable transition name
- Required input: `issueKey`, `transitionName`
- Output: resolved transition plus execution result
- Guardrail: only transition names actually available on that issue may be used

### `link_issues`

- Purpose: create a dependency or relationship link
- Required input: `typeName`, `inwardIssueKey`, `outwardIssueKey`
- Output: link confirmation
- Guardrail: self-linking is rejected

### `delete_issue_link`

- Purpose: remove an issue link by link ID during controlled relink or drift cleanup
- Required input: `linkId`
- Output: deletion confirmation
- Guardrail: admin-risk cleanup action; requires explicit confirmation when confirmation gates are enabled

### `add_comment`

- Purpose: add a Jira comment
- Required input: `issueKey`, `comment`
- Output: comment ID and URL
- Guardrail: empty comments are rejected; use concise start, progress, blocker, and handoff notes when they improve auditability

### `add_worklog`

- Purpose: add a worklog entry
- Required input: `issueKey`, `timeSpentSeconds`
- Output: worklog confirmation
- Guardrail: validates payload shape only; daily worklog writes execute live by default

### `create_doc_page`

- Purpose: create a Confluence page
- Required input: `spaceId`, `title`, `bodyStorage`
- Output: created page ID and URL
- Guardrail: only active when Confluence is configured

### `list_doc_spaces`

- Purpose: list accessible Confluence spaces
- Required input: none
- Output: accessible space IDs, names, and basic metadata
- Guardrail: only active when Confluence is configured

### `search_doc_pages`

- Purpose: search Confluence pages by space, title, and optional labels
- Required input: none, but `spaceId`, `title`, or `labels` should normally narrow the search
- Output: matching page metadata
- Guardrail: title matching is treated conservatively for duplicate-aware publishing

### `get_doc_page`

- Purpose: read a Confluence page
- Required input: `pageId`
- Output: page metadata, labels, and storage body when available
- Guardrail: only active when Confluence is configured

### `update_doc_page`

- Purpose: update a Confluence page with an explicit version
- Required input: `pageId`, `bodyStorage`, `version`
- Output: updated page metadata
- Guardrail: executes live by default when Confluence is configured; explicit preview remains available through `JIRA_EXECUTION_MODE=dry-run`

### `plan_project_doc_page`

- Purpose: build a deterministic repo-first Confluence publishing plan for a supported project document type
- Required input: `docType`
- Output: title, labels, source references, body preview, page identity, and upsert decision
- Guardrail: if the target space is not known, planning stops with a clear configuration error

### `ensure_project_doc_page`

- Purpose: create or update a supported project-document page after duplicate-aware identity checks
- Required input: `docType`
- Output: `created`, `updated`, or `manual_step_required` plus page identity and traceability metadata
- Guardrail: executes live by default when Confluence is configured; if multiple exact page matches exist, the tool refuses to write blindly

### `get_doc_space_profile`

- Purpose: inspect a Confluence space before governance planning
- Required input: `spaceId`
- Output: space metadata, sampled-page summary, and governance-policy signals
- Guardrail: read-only and designed to make admin gaps explicit

### `plan_doc_governance`

- Purpose: plan template, content-status, and restriction governance for a supported document type
- Required input: `docType`, `spaceId`
- Output: governance status signals, metadata policy, sensitivity guidance, and manual admin steps
- Guardrail: planning-only; does not mutate native Confluence admin settings

### `analyze_doc_staleness`

- Purpose: analyze Confluence pages for stale-content and broken publishing-contract signals
- Required input: `spaceId`
- Output: heuristic stale candidates, broken-contract signals, and recommended remediation actions
- Guardrail: read-only and intentionally heuristic; archive or cleanup decisions still require human review

### `plan_doc_remediation`

- Purpose: turn stale-content analysis into a conservative or aggressive remediation plan
- Required input: `spaceId`
- Output: page-level remediation actions, reasons, and manual admin steps
- Guardrail: planning-only; never archives or rewrites Confluence pages directly

### `plan_doc_metadata_policy`

- Purpose: define the expected metadata contract for a supported project-document type
- Required input: `docType`
- Output: required metadata fields, fallback representation, native-Confluence gap notes, and manual admin steps
- Guardrail: planning-only and explicit about the difference between repo-first fallbacks and native Confluence metadata features

### `plan_doc_index_pages`

- Purpose: recommend index-page and reporting structure for repo-first project documentation
- Required input: `spaceId`
- Output: recommended index pages, supporting document types, fallback reporting model, and manual admin steps
- Guardrail: planning-only; does not create or mutate index pages automatically

### `ensure_issue_type_available`

- Purpose: create an issue type when possible and report whether the target project can actually use it
- Required input: `projectKey`, `issueTypeName`
- Output: issue-type capability snapshot, optional created issue type, and manual-step guidance
- Guardrail: admin-risk write; requires explicit confirmation when confirmation gates are enabled and may still require manual project-level Jira admin work

### `ensure_custom_field_available`

- Purpose: create a custom field when possible and report whether it is available on the target project and issue type
- Required input: `fieldName`
- Output: matched or created field, target availability signal, and manual-step guidance
- Guardrail: admin-risk write; requires explicit confirmation when confirmation gates are enabled and may still require manual Jira admin work

## Higher-Level Delivery Tools

### `pick_next_issue`

- Purpose: choose the next issue to work on
- Required input: none
- Output: a recommended issue, execution ordering, dependency snapshot, dependency-impact summary, status signals, blocked candidates
- Guardrail: excludes completed work and blocked lifecycle candidates

### `seed_project_kickoff`

- Purpose: seed a reusable kickoff backlog into a Jira project, generate linked pre-development test plans for implementation work by default, and optionally start the first work item
- Required input: none if a default project is configured
- Output: created or reused issues, dependency links, generated or reused quality companion test plans, and the optionally started first issue
- Guardrail: executes live by default because it creates ordinary issue-level delivery work; use explicit preview mode when planning without writes

### `select_issue_for_work`

- Purpose: move work into a ready queue such as `Selected`
- Required input: `issueKey`
- Output: resolved selection transition
- Guardrail: completed or dependency-blocked work should not be selected

### `start_issue_work`

- Purpose: start work on an eligible issue
- Required input: `issueKey`
- Output: either a normal success result or a structured fallback result with `resultType` and reconciliation metadata when normal delivery movement is blocked
- Guardrail: completed or blocked work is rejected by the ordinary helper path; if the issue looks drifted instead of truly blocked, the tool may auto-apply low/medium-risk reconciliation and only stops for confirmation on risky reconciliation

### `sync_issue_progress`

- Purpose: sync an actively worked issue into the correct execution state and leave a concise progress trace
- Required input: `issueKey`, `progressComment`
- Output: either a normal success result or a structured fallback result with `resultType`; reconciliation-backed outcomes also include the reconciliation result plus progress-trace logging status
- Guardrail: executes live by default; terminal issues stay rejected, but drifted issues may be repaired automatically when reconciliation risk is low or medium

### `apply_issue_state_reconciliation`

- Purpose: align an issue to the planned workflow target using one direct transition when possible or a safe multi-hop path when necessary
- Required input: `issueKey`
- Output: resulting state, executed path, and audit comment
- Guardrail: executes live by default for low-risk reconciliation; risky reconciliation requires explicit confirmation and stops on human-gate, dependency, quality, or missing-path defects

### `handoff_issue`

- Purpose: move work into review or handoff
- Required input: `issueKey`
- Output: resolved review transition
- Guardrail: only valid review-like transitions may be used

### `send_issue_to_qa`

- Purpose: move work into a QA or validation phase
- Required input: `issueKey`
- Output: resolved QA transition
- Guardrail: blocked work should not move to QA

### `mark_issue_blocked`

- Purpose: move an issue into a blocked lifecycle state
- Required input: `issueKey`, `comment`
- Output: resolved blocked transition
- Guardrail: a reason is required; operational blocked-state movement executes live by default

### `close_issue_if_ready`

- Purpose: close an issue when readiness conditions are met
- Required input: `issueKey`, `testsPassed`, `docsUpdated`, `reviewComplete`
- Output: either a normal success result or a structured fallback result with `resultType` and reconciliation metadata when ordinary closure is blocked
- Guardrail: all caller checklist items must pass first; after that, ordinary readiness remains strict, low/medium-risk reconciliation may repair drift automatically, and risky reconciliation stops for confirmation instead of silently forcing terminal movement

### `generate_validation_work`

- Purpose: turn acceptance criteria into a dedicated pre-development test plan or validation item
- Required input: `issueKey`
- Output: test plan or validation work plan, selected issue-type strategy, created issue in live mode, and link plan back to the parent work item
- Guardrail: executes live by default; prefers native Validation/Test/Test Case/Test Plan issue types and falls back to `Task` plus quality labels when needed; inspect existing coverage first when possible, then reuse, update, or add only the missing happy-path, edge-case, and negative-path coverage

### `create_bug_from_validation_failure`

- Purpose: turn a failed validation into a bug with structured evidence and linked parent impact
- Required input: `parentIssueKey`, `summary`, `actualBehavior`, `expectedBehavior`, `reproductionSteps`
- Output: bug creation plan, selected issue-type strategy, created issue in live mode, link plans to the parent and validation work, and parent status-correction guidance when failed validation should move delivery back out of QA/review/done
- Guardrail: executes live by default; prefers native `Bug` and falls back to `Task` plus quality labels when needed; parent status correction should follow real Jira transitions and surface a manual step when no safe transition exists

### `plan_retest_loop`

- Purpose: recommend the next quality step after a bug fix or reopen path
- Required input: `parentIssueKey`, `bugIssueKey`
- Output: next action, status snapshot, and notes about whether to continue fixing, reuse validation work, generate validation work, or re-evaluate readiness
- Guardrail: read-only and does not move issues automatically

## Live Write Rule

- Daily issue and documentation writes execute live by default.
- Admin-risk writes require explicit confirmation when confirmation gates are enabled.
- Explicit preview mode remains available through `JIRA_EXECUTION_MODE=dry-run`.
