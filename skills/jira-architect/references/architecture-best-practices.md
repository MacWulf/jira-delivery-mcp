# Architecture Best Practices

Use this reference when Architect must make or validate a software architecture decision.

## Source Basis

- CMU SEI ATAM: evaluate architecture through competing quality attributes and explicit tradeoffs.
- Azure, AWS, and Google Cloud Well-Architected frameworks: review reliability, security, operations or operational excellence, performance, cost, and sustainability or responsible resource use.
- arc42: make constraints explicit because they limit design, implementation, and process choices.
- OWASP SAMM: treat security as risk-driven lifecycle work, not late review.
- Thoughtworks fitness functions: turn architecture goals into measurable checks where possible.

## Mandatory Decision Baseline

For mandatory-gate architecture work, decide and record:

- business driver or delivery reason
- affected scope and boundaries
- quality attributes optimized
- quality attributes accepted as tradeoffs
- hard constraints
- rejected alternatives with short reasons
- security, reliability, operations, performance, and cost impact
- migration or cleanup debt when relevant
- validation expectations and next owning skill

## Quality Attribute Checklist

Consider these qualities for every non-trivial decision:

- Reliability: availability, recovery, failure isolation, backup, retry, idempotency.
- Security: data protection, identity, authorization, secrets, threat exposure, dependency risk.
- Operational excellence: observability, deployability, incident response, runbooks, support ownership.
- Performance: latency, throughput, scale path, capacity model, bottlenecks.
- Cost: resource use, operating cost, implementation cost, waste, lifecycle cost.
- Sustainability or responsible use: efficiency, resource right-sizing, unnecessary workload reduction.
- Modifiability: coupling, cohesion, ownership, testability, replaceability.
- Usability for builders: clear boundaries, clear contracts, low accidental complexity.

Security and operational excellence are not casual tradeoff targets. If weakening either is unavoidable, require an ADR and explicit risk treatment.

## Boundary Rules

Architect activates when work changes:

- module or package boundaries
- service or deployment units
- storage ownership
- data flow
- API or integration contracts
- authentication or authorization path
- workflow lifecycle
- shared abstractions
- observability or operational ownership

Decision must state who owns each boundary and what must not cross it.

## Constraint Rules

Hard constraints must be written as enforceable statements:

- "Code in X must not import Y."
- "Only service A may write table B."
- "All external callbacks must verify signature C."
- "New route D must emit metric E and trace field F."

Avoid vague guidance:

- "Try to keep it clean."
- "Consider security."
- "Prefer good separation."

If a constraint cannot be checked automatically, hand the check to `jira-quality-control` as manual or reviewable validation.

## Decision Shape

Use smallest durable decision that is safe:

- Advisory: local guidance, no block.
- Mandatory gate: ADR or architecture page, hard constraints, Jira sync, affected-work control.
- Spike-needed: bounded evidence ticket before implementation continues.

When confidence is low, do not guess across high-impact boundaries. Create bounded spike work with a clear question, source paths, success criteria, and timebox.

## Jira And Skill Handoff

After decision:

- route test expectations to `jira-quality-control`
- route issue splitting or backlog changes to `jira-intake-refinement`
- route status movement to `jira-execution-loop`
- route Confluence publishing mechanics to `jira-documentation-publishing`
- route workflow or field policy needs to `jira-workflow-admin`

Architect keeps decision authority. Other skills own their mechanics.
