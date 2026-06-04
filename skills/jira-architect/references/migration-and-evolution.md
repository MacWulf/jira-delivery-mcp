# Migration And Evolution

Use this reference for medium refactors, legacy replacement, modularization, and architecture evolution.

## Source Basis

- Martin Fowler, Strangler Fig Application: serious legacy replacement is usually safer as gradual modernization than simple full replacement.
- Thoughtworks fitness function-driven development: architecture goals can be expressed as objective checks that expose drift and technical debt.
- Well-Architected frameworks: architecture improves through iterative review, production learning, and evolving workload maturity.
- SEI ATAM: candidate architectures should be analyzed against quality tradeoffs and refined through risk mitigation.

## Migration Decision Rules

Prefer incremental migration when:

- current system must keep serving users
- behavior is not fully known
- replacement scope is large
- business needs new features during migration
- operational risk is high
- data migration or integration risk exists

Use direct replacement only when:

- affected surface is small
- behavior is fully known
- rollback is simple
- downtime or cutover risk is acceptable
- transitional architecture would cost more than it reduces risk

Recommended default: incremental migration. Reason: lower delivery risk and earlier learning.

## Refactor Rules

For medium-or-larger refactors, Architect must decide:

- target boundary
- preserved behavior
- changed behavior, if any
- migration slice order
- compatibility strategy
- rollback or fallback path
- temporary code or infrastructure
- cleanup ticket or debt note
- validation checks

Do not allow broad refactor work without explicit affected scope.

## Transitional Architecture

Temporary architecture is allowed when it reduces migration risk.

It must have:

- reason
- owner
- removal condition
- cleanup Jira issue or explicit debt note
- validation proving old and new paths still behave correctly

Do not leave temporary bridges, adapters, dual writes, proxy routes, or compatibility layers undocumented.

## Fitness Checks

When architecture intent can be measured, create validation expectations such as:

- forbidden dependency checks
- ownership or import rules
- public API compatibility checks
- latency or throughput thresholds
- observability checks for logs, metrics, traces, and health endpoints
- security checks for secrets, dependencies, auth, and vulnerability scans
- deployment checks for required stages or approvals
- documentation checks for ADR and diagram links

Route these checks to `jira-quality-control` or implementation work. Architect defines what must be true; QC validates it.

## Evolution Guardrails

Architecture may evolve, but decision history must stay traceable:

- update existing ADR for minor clarifications
- supersede ADR for material direction changes
- preserve rejected alternatives
- keep Jira links and Confluence pages current
- unblock only issues whose architecture gate is actually resolved

## Spike Rules

Create bounded spike work when:

- the target boundary is unclear
- current behavior is unknown
- performance or reliability risk cannot be inferred
- security impact is uncertain
- migration sequence has multiple plausible high-risk options

Spike must include:

- one decision question
- evidence to gather
- source paths or systems to inspect
- timebox or stopping rule
- expected output
- affected implementation blocked until answer exists
