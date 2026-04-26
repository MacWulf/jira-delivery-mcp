# Tenant Modes

Use this reference to decide how Jira work should be handled in a tenant-aware way without overfitting the skill to one project model.

## Core Principle

Do not assume one Jira model fits every project. First determine whether the project is:

- `company-managed`
- `team-managed`

Then adapt the workflow, field, and admin guidance accordingly.

## Company-Managed

Use this mode when the project relies on shared schemes and admin-controlled configuration.

Typical implications:

- Workflow changes may require workflow scheme updates.
- Field visibility may depend on field configurations and screens.
- Issue type behavior can vary by scheme assignment.
- Admin changes should be treated as controlled and migration-sensitive.
- Public REST APIs usually cover more of the admin surface here than in team-managed projects.

## Team-Managed

Use this mode when the project is self-contained and project-level configuration is preferred.

Typical implications:

- Workflow and columns are often edited directly in the project.
- Scheme-level concepts are limited or not exposed in the same way.
- Keep guidance practical and project-local.
- Avoid assuming company-managed admin APIs apply.
- If the desired change is not safely possible through the available AI tools or public API, stop and tell the user the manual Jira step.

## Decision Rule

If the tenant mode is unknown, inspect the project before suggesting admin changes.

Prefer this order:

1. Read the current project type and workflow shape.
2. Classify the request as intake, execution, or admin work.
3. Only then recommend transitions, workflow edits, or blueprint changes.

## Safety Rule

Do not rewrite workflow or field policy unless the user explicitly wants admin-level changes.
For normal delivery work, adapt to the existing Jira setup instead of reshaping it.
For quality-control work, prefer the smallest issue-type or field-policy change that preserves evidence, validation, and retest traceability.
If the capability boundary is hit, say so plainly instead of implying the AI can do more than the tenant and tool surface actually allow.
