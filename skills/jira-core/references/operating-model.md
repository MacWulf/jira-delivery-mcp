# Operating Model

This skill package should behave like a small Jira operating system, not a single one-off helper.

## Roles

- `jira-core`: route the request and select the right working mode.
- `jira-project-bootstrap`: turn a brief into a Jira project shape, starter backlog, and first delivery slice.
- `jira-intake-refinement`: classify, shape, and ready backlog items.
- `jira-execution-loop`: pick the next issue, move work forward, and close it safely.
- `jira-workflow-admin`: handle workflow, scheme, and configuration changes.

## Routing Rule

Before acting, determine which of these is true:

- A new project is being bootstrapped from a brief or repo.
- New work is being proposed or cleaned up.
- Existing work is being executed.
- Jira configuration is being changed.

Then hand off to the narrowest skill that can handle the task.

## Output Standard

Every meaningful Jira action should leave a useful audit trail:

- clear issue summary
- concise description
- acceptance criteria or repro steps where needed
- dependency links when relevant
- status changes only when the work is actually ready
- explicit manual-step notice when the requested Jira action is outside the safe AI or public API capability boundary

## Backlog Discipline

Use Jira as the source of truth for delivery state.

Keep intake work separate from execution work so that the backlog can stay clean and the active queue can stay small.
