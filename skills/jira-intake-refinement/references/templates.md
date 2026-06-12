# Intake Templates

Use these templates as a compact starting point when shaping Jira work.

## Epic Template

Summary:
`[Outcome] for [area]`

Description:
`This epic covers [goal] and will deliver [business or product outcome].`

## Story Template

Summary:
`As a [user], I want [capability], so that [value].`

Acceptance criteria:

- `Given ... when ... then ...`
- `The expected result is ...`
- `Edge cases: ...`

## Task Template

Summary:
`Implement [specific work item]`

Description:
`This task covers [implementation detail], including [constraints or dependencies].`

Architecture:
`Architect decision: [ADR link, hard constraints, or not applicable].`

## Bug Template

Summary:
`[Component] fails when [condition]`

Description:

- Expected:
- Actual:
- Steps to reproduce:
- Impact:
- Notes:

## Refinement Checklist

- Replace vague language with observable behavior.
- Split mixed tickets into separate issues.
- Add parent links and dependencies.
- Keep the item small enough to start work immediately.
- For medium-or-larger refactors, cross-boundary changes, ADR needs, hard constraints, contradictions, or bounded spikes, add `jira-architect` as expected companion before execution.
- For any item likely to require code changes, add `jira-quality-control` as the expected follow-up before implementation so a pre-dev test plan issue guides the coding work.
