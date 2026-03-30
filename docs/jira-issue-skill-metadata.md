# Jira Issue Skill Metadata

This specification defines how to embed required and optional skills into a Jira issue description so the assistant can resolve the right skill stack before execution.

## Purpose

- Make the ticket describe not only the work, but also the execution context.
- Support routing without replacing the actual issue description.
- Keep the format machine-readable and easy to review.

## Placement

Store the skill metadata inside the Jira issue `Description` field in a dedicated block.

Recommended structure:

    ## Execution metadata

    ```yaml
    codex:
      required_skills:
        - jira-project-bootstrap
        - jira-intake-refinement
      optional_skills:
        - jira-workflow-admin
      execution_mode: dry-run
    ```

## Recommended Format

```yaml
codex:
  required_skills:
    - jira-core
    - jira-execution-loop
  optional_skills:
    - jira-project-bootstrap
  execution_mode: implement
  notes: "Optional short routing note"
```

## Fields

- `required_skills`
  Skills that must be loaded for execution.
- `optional_skills`
  Skills that may help, but should not block progress.
- `execution_mode`
  Optional hint such as `dry-run`, `implement`, `review`, or `admin`.
- `notes`
  A short human-readable routing note.

## Read Rules

- Read the ticket first, then resolve the skill metadata.
- If a referenced skill is unavailable locally, report that clearly.
- Treat `required_skills` as an execution expectation, not a suggestion.
- Only use optional skills when they add value without creating unnecessary context.

## Safe Usage

- Do not put secrets into skill metadata.
- Do not use the metadata block instead of a real issue description.
- Do not list every possible skill; only list the ones that materially matter.
- Do not use metadata to bypass workflow or approval policy.
- Treat metadata as routing guidance, not as an authorization mechanism.

## Suggested Examples

### Project Bootstrap

```yaml
codex:
  required_skills:
    - jira-core
    - jira-project-bootstrap
  optional_skills:
    - jira-intake-refinement
  execution_mode: dry-run
```

### Backlog Refinement

```yaml
codex:
  required_skills:
    - jira-core
    - jira-intake-refinement
  optional_skills:
    - jira-workflow-admin
  execution_mode: refine
```

### Delivery Execution

```yaml
codex:
  required_skills:
    - jira-core
    - jira-execution-loop
  optional_skills:
    - jira-workflow-admin
  execution_mode: implement
```

## Fallback

If no metadata block exists, the assistant can infer the required skill stack from the ticket text and project context.

If the metadata block exists, it takes precedence unless it is contradictory or invalid.
