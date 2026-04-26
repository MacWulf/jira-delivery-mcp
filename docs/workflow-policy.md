# Workflow Policy

## Reference Delivery Lifecycle

The recommended delivery lifecycle is:

- `To Do`
- `Selected`
- `In Progress`
- `Blocked`
- `In Review`
- `QA`
- `User Testing`
- `Cancelled`
- `Done`

## Why This Lifecycle

- `To Do` keeps raw backlog work separate from ready work.
- `Selected` contains work that is refined, owned, and safe to start next.
- `Blocked` makes active delivery interruptions visible.
- `In Review` separates implementation completion from acceptance validation.
- `QA` captures assistant-owned or technically verifiable validation against acceptance criteria.
- `User Testing` captures human-owned business or manual validation after technical QA is complete.
- `Cancelled` captures scope that was intentionally stopped or removed without being delivered.
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
- `Send To User Testing`: `QA` -> `User Testing`
- `User Testing Failed`: `User Testing` -> `In Progress`
- `Accepted`: `User Testing` -> `Done`
- `Cancel Work`: `To Do`, `Selected`, `In Progress`, `Blocked`, `In Review`, `QA`, `User Testing` -> `Cancelled`
- `Restore To Do`: `Cancelled` -> `To Do`
- `Return To Do`: `Selected`, `In Progress`, `Blocked`, `In Review`, `QA`, `User Testing` -> `To Do`

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

If the assistant has started substantive work on an issue, that issue should not remain in `To Do` or an equivalent backlog state.

Minimum expectation once work really begins:

- move the issue into the correct active state through a real Jira transition
- leave a concise progress or start note when that materially improves traceability
- if the transition or audit step cannot be completed through the available tools, stop and surface the missing Jira step instead of silently continuing

## Gate Semantics

Use these meanings consistently:

- `QA`: assistant-owned or technically verifiable validation
- `User Testing`: human-owned manual or business validation
- `Done`: only after the final required gate is cleared

Human-gate precedence should be:

1. execution metadata
2. labels
3. workflow default

When the workflow includes `User Testing`, that should be the default human gate. In legacy workflows without `User Testing`, the human-gate fallback remains `QA`.
