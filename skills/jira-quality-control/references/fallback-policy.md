# Fallback Policy

Use the smallest artifact that still preserves evidence and traceability.

## Issue Type Priority

1. Native validation/test style issue type, when the tenant supports it.
2. Native `Bug` for defect handling.
3. `Task` with quality labels and a parent link.
4. Manual Jira admin step if the fallback cannot preserve the required behavior.

For pre-development test plans, always prefer a validation/test-style issue type first. If the tenant does not expose one, use `Task` with quality/test labels rather than hiding the plan inside the parent issue description.

## Field Priority

1. Existing field or description block.
2. Safely configurable or creatable field.
3. Structured description fallback.
4. Structured comment only as an audit note when the readiness or evidence guard does not read comments.
5. Manual Jira admin step if the fallback would lose auditability.

When a bug fallback issue lacks required evidence, update the issue description with `update_issue`. Comments may explain the repair, but they do not replace the description block unless the active guard explicitly reads comments.

## Labels

Suggested labels for fallback quality work:

- `quality`
- `quality-validation`
- `quality-test`
- `pre-dev-test-plan`
- `bug`
- `retest`
