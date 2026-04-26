# Team-Managed Caveats

Use this reference when the project is team-managed or simplified.

## Key Differences

- Workflow control is simpler and more project-local.
- Scheme-level admin concepts are usually limited or absent.
- The project may not expose the same workflow architecture as company-managed Jira.
- Some admin actions available in company-managed projects are not available here.

## Practical Guidance

- First inspect the actual project behavior before assuming scheme-based control.
- Do not force company-managed terminology onto a team-managed project.
- Adapt the skill to the project's real transitions and settings.
- Keep changes lightweight unless the project truly needs a migration.

## Safe Approach

- Read the current project configuration.
- Map the existing statuses and transitions.
- Only then decide whether a workflow change is worth it.
- If the team needs technical QA and human acceptance separated on the board, prefer adding a single `User Testing` status after `QA` instead of duplicating multiple review-like states.
- If the team needs to represent intentionally stopped backlog items, prefer a distinct `Cancelled` status with an explicit restore path instead of abusing `Done`.
