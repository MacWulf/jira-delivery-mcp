# Architect Best Practices

## Purpose

This document records the public source basis for the Architect best-practice references bundled with `jira-architect`.

## Best-Practice Areas

Architect decisions need guidance for:

- architecture decision authority and tradeoff handling
- quality attributes and cross-pillar review
- hard constraints
- module, service, data, integration, and deployment boundaries
- diagramming and visual communication
- ADR lifecycle
- security architecture
- reliability, operations, observability, and production readiness
- performance, cost, sustainability, and responsible resource use
- migration, refactor, and legacy replacement strategy
- architecture evolution and measurable fitness checks
- downstream Jira skill routing and validation handoff

## Source Set

Primary and widely accepted sources:

- CMU SEI Architecture Tradeoff Analysis Method: `https://www.sei.cmu.edu/library/the-architecture-tradeoff-analysis-method/`
- Microsoft Azure Well-Architected Framework: `https://learn.microsoft.com/en-us/azure/well-architected/what-is-well-architected-framework`
- AWS Well-Architected Framework: `https://docs.aws.amazon.com/wellarchitected/latest/framework/definitions.html`
- Google Cloud Architecture Framework: `https://docs.cloud.google.com/architecture/framework`
- C4 model: `https://c4model.com/diagrams`
- arc42 template overview: `https://arc42.org/overview`
- Martin Fowler, Architecture Decision Record: `https://martinfowler.com/bliki/ArchitectureDecisionRecord.html`
- OWASP SAMM: `https://owasp.org/www-project-samm/`
- Thoughtworks fitness function-driven development: `https://www.thoughtworks.com/en-ca/insights/articles/fitness-function-driven-development`
- Martin Fowler, Strangler Fig Application: `https://martinfowler.com/bliki/StranglerFigApplication.html`

## Implementation Decision

Keep core routing and workflow in `skills/jira-architect/SKILL.md`.

Keep detailed best-practice guidance in bundled references:

- `skills/jira-architect/references/architecture-best-practices.md`
- `skills/jira-architect/references/diagramming.md`
- `skills/jira-architect/references/migration-and-evolution.md`

Do not reference private discovery docs from the installed skill.

## Rejected Directions

- Put all best practices in `SKILL.md`: rejected because it would bloat always-loaded context.
- Create many tiny source-specific references: rejected because the skill needs action guidance, not a bibliography maze.
- Keep routing in a separate reference: rejected because routing is core behavior.
- Mention local or tenant-specific discovery docs as skill inputs: rejected because public releases must be portable.
