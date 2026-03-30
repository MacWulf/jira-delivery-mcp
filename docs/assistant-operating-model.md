# Jira Assistant Operating Model

## Sources of Truth

- Jira is the source of truth for work state.
- The repository is the source of truth for code and implementation artifacts.
- Documentation lives in the repository first, with optional Confluence publishing when configured.

## Environment Separation

- Daily delivery work should run against the main project.
- Controlled validation writes should run in a dedicated validation project when available.
- Validation utilities should not pollute the primary delivery backlog.

## Core Loop

1. Read the current project or brief.
2. Inspect project structure, dependencies, and workflow state.
3. Create or refine epics, stories, tasks, or subtasks when the backlog is incomplete.
4. Link dependencies explicitly in Jira.
5. Pick the next eligible issue.
6. Resolve the valid Jira transitions before changing status.
7. Comment, log work, and document meaningful decisions while executing.
8. Move the issue to the correct lifecycle state.
9. Re-evaluate the next eligible issue.

## Required Behaviors

### Planning

- Read before writing.
- Check for duplicates before creating new Jira items.
- Break large goals into startable work items.
- If an issue description contains execution metadata, resolve it before execution.

### Execution

- Read the current issue state before every write.
- Never assume the workflow; always use transitions that Jira exposes.
- Do not start blocked work.
- Prefer `Selected` work over raw backlog items when the project uses a ready queue.
- Treat required skill metadata as part of the issue execution contract.

### Documentation

- Record meaningful decisions and state changes with comments or structured documents.
- Preserve short decision trails, not just status changes.

### Prioritization

- Prefer unblocked, high-priority work.
- Do not re-select completed issues.
- When no eligible work exists, report that state explicitly.

## Safety Model

- Write operations default to `dry-run`.
- Live writes require explicit confirmation.
- Workflow assumptions must be discovered from the target project, not hardcoded into execution.
- Controlled validation runs should use a dedicated validation project whenever one exists.

## Typical Tool Sequences

### Project Setup

- `list_projects`
- `get_project`
- `get_project_admin_snapshot`
- `bootstrap_software_project`
- `search_issues`
- `create_issue`
- `link_issues`

### Start the Next Item

- `pick_next_issue`
- `get_issue`
- `get_transitions`
- `select_issue_for_work`
- `start_issue_work`

### During Execution

- `update_issue`
- `add_comment`
- `add_worklog`
- `create_doc_page`

### Handoff or Close

- `handoff_issue`
- `send_issue_to_qa`
- `mark_issue_blocked`
- `close_issue_if_ready`

## Next Maturity Steps

- [Capability map](./capability-map.md)
- project-specific policy configuration
- approval gates for workflow administration and migrations
- duplicate detection
- richer backlog health checks
