# Backlog Seeding Pattern

Use this pattern to seed a new Jira project from a brief.

## Recommended Order

1. Create the project shell.
2. Define the top-level outcome as an epic.
3. Split the outcome into a small number of stories.
4. Add implementation tasks only where needed.
5. Add bugs only when there is a known defect or migration risk.
6. Add dependencies explicitly.
7. For each behavior-changing delivery item, create or require a linked pre-development test plan issue through `jira-quality-control`.

## Seeding Rules

- Keep the first backlog small.
- Prefer 1 epic with 3 to 7 starter stories.
- Use stories for user-facing or stakeholder-visible outcomes.
- Use tasks for setup, scaffolding, integration plumbing, mock data, and other technical enablement.
- Do not create every possible task on day one.
- Make each item startable, not merely descriptive.
- Use parent links instead of flattening everything into one list.
- Do not use one generic QA issue as a substitute for linked pre-dev test plans unless it explicitly covers and links to every affected delivery issue.

## Tenant-Aware Notes

- In `team-managed`, keep the structure lightweight and project-local.
- In `company-managed`, be more deliberate about workflow, fields, and shared governance.

## Quality Bar

- Clear summary
- Short description of value or work
- Acceptance criteria or success condition
- Linked pre-dev test plan for every behavior-changing delivery issue
- Dependencies when relevant
- Ready for execution without guesswork
