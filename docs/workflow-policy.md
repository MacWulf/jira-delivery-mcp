# Workflow Policy

## Reference Delivery Lifecycle

The recommended delivery lifecycle is:

- `To Do`
- `Selected`
- `In Progress`
- `Blocked`
- `In Review`
- `QA`
- `Done`

## Why This Lifecycle

- `To Do` keeps raw backlog work separate from ready work.
- `Selected` contains work that is refined, owned, and safe to start next.
- `Blocked` makes active delivery interruptions visible.
- `In Review` separates implementation completion from acceptance validation.
- `QA` captures explicit validation against acceptance criteria.
- `Done` should only be used once completion is verified.

## Blocking Model

Use a hybrid model:

- Jira `Blocks` links remain the authoritative dependency source
- the `Blocked` status represents the current execution state when progress has stopped

This gives two useful views:

- the link shows exactly what blocks the work
- the lifecycle state shows whether the work is currently stalled

## Target Transitions

- `Create`: new issue -> `To Do`
- `Select Work`: `To Do` -> `Selected`
- `Start Work`: `To Do` or `Selected` -> `In Progress`
- `Mark Blocked`: `Selected`, `In Progress`, `In Review`, `QA` -> `Blocked`
- `Resume Work`: `Blocked` -> `In Progress`
- `Work Done`: `In Progress` -> `In Review`
- `Request Changes`: `In Review` -> `In Progress`
- `Send To QA`: `In Review` -> `QA`
- `QA Failed`: `QA` -> `In Progress`
- `Accepted`: `QA` -> `Done`
- `Return To Do`: `Selected`, `In Progress`, `Blocked`, `In Review`, `QA` -> `To Do`

## Rollout Principle

Workflow redesign is part of the project, but live projects should only be updated through a controlled validation flow.

Recommended order:

1. finalize lifecycle policy
2. create missing statuses
3. validate the workflow delta
4. apply the Jira workflow change
5. update assistant transition policy
6. review open issues and next-issue selection behavior afterward

## Execution Rule

The assistant should adapt to the current project workflow, but it must always act through transitions that Jira actually exposes for the current issue.
