# Company-Managed Workflow Standard

Use this reference when the project uses company-managed Jira.

## What Matters

- Workflow state should reflect delivery reality, not wishful progress.
- Status names should be stable and easy to understand.
- Each transition should have a clear reason and a clear destination.
- Validators, conditions, and permissions should be explicit.
- Screens and required fields should match the workflow intent.

## Typical Design Goals

- Separate intake from active execution.
- Make review or approval steps visible.
- Block premature closure.
- Keep the number of transitions small unless a control point is needed.
- Use workflow schemes to map issue types to the right process.

## Change Discipline

- Prefer discovery before modification.
- Export or inspect the current workflow before editing it.
- Make one controlled change at a time.
- Check whether the workflow is shared before changing it.
- Treat workflow edits as admin work, not routine issue work.

