# Triage Governance

Use this reference when bug intake, reopened work, or retest queues need explicit governance.

## Minimum Bug Intake

Every bug should capture:

- summary
- actual behavior
- expected behavior
- reproduction steps
- environment when relevant
- evidence or an explicit note that evidence is missing

If dedicated fields are unavailable, keep this in a structured description block.

If this block is missing or malformed on an existing bug, use `update_issue` to repair the description before closure or retest handoff. Use `add_comment` only for audit trail unless the active policy explicitly evaluates comments.

## Triage Outcomes

Use these semantic outcomes:

- `repro-ready`
- `need-info`
- `duplicate`
- `rejected`
- `non-repro`

These are not mandatory status names. Preserve them through workflow states when the tenant already supports them; otherwise use labels and visible Jira notes.

## Reopened And Non-Repro

- reopened work should move the affected delivery item out of quality-approved states when a safe transition exists
- non-repro should stay auditable and reopenable
- need-info should not stay mixed into the normal active queue

## Queue Recommendations

Prefer explicit Jira views for:

- triage inbox
- need-info
- reopened or qa-failed
- retest

If the tenant cannot support dedicated workflow states, use saved filters and labels instead of pretending the governance does not exist.
