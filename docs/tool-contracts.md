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
- Output: issue fields, status, execution metadata, dependency snapshot, status signals
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

## Core Write Tools

### `bootstrap_project_from_template`

- Purpose: create a new Jira project from an explicit template
- Required input: `key`, `name`, `projectTypeKey`, `projectTemplateKey`
- Output: created project metadata or a dry-run payload
- Guardrail: defaults to `dry-run`; live mode requires explicit confirmation

### `bootstrap_software_project`

- Purpose: create a software project from higher-level delivery choices
- Required input: `key`, `name`
- Output: created project metadata or a dry-run payload
- Guardrail: defaults to dry-run and sensible software-project defaults

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
- Guardrail: live mode requires explicit confirmation

### `add_comment`

- Purpose: add a Jira comment
- Required input: `issueKey`, `comment`
- Output: comment ID and URL
- Guardrail: empty comments are rejected

### `add_worklog`

- Purpose: add a worklog entry
- Required input: `issueKey`, `timeSpentSeconds`
- Output: worklog confirmation
- Guardrail: live mode requires explicit confirmation

### `create_doc_page`

- Purpose: create a Confluence page
- Required input: `spaceId`, `title`, `bodyStorage`
- Output: created page ID and URL
- Guardrail: only active when Confluence is configured

## Higher-Level Delivery Tools

### `pick_next_issue`

- Purpose: choose the next issue to work on
- Required input: none
- Output: a recommended issue, execution ordering, dependency snapshot, status signals, blocked candidates
- Guardrail: excludes completed work and blocked lifecycle candidates

### `seed_project_kickoff`

- Purpose: seed a reusable kickoff backlog into a Jira project and optionally start the first work item
- Required input: none if a default project is configured
- Output: created or reused issues, dependency links, and the optionally started first issue
- Guardrail: live mode requires explicit confirmation

### `select_issue_for_work`

- Purpose: move work into a ready queue such as `Selected`
- Required input: `issueKey`
- Output: resolved selection transition
- Guardrail: completed or dependency-blocked work should not be selected

### `start_issue_work`

- Purpose: start work on an eligible issue
- Required input: `issueKey`
- Output: resolved in-progress transition
- Guardrail: completed or blocked work is rejected

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
- Guardrail: a reason is required and live mode requires confirmation

### `close_issue_if_ready`

- Purpose: close an issue when readiness conditions are met
- Required input: `issueKey`, `testsPassed`, `docsUpdated`, `reviewComplete`
- Output: resolved done transition
- Guardrail: all checklist items must pass and the issue must not be blocked

## Live Write Rule

- Write tools default to `dry-run`.
- Live mode requires explicit confirmation.
- Controlled validation flows should use a dedicated validation project when one is configured.
