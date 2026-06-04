# Diagramming

Use this reference when Architect needs visual architecture output.

## Source Basis

- C4 model: system context, container, component, and code diagrams.
- C4 guidance: use only diagram levels that add value; context and container diagrams are enough for most teams.
- arc42: document context, constraints, building blocks, runtime, deployment, and quality requirements when they matter.

## Default Diagram Policy

Create or update diagrams only when they help a decision or downstream execution.

Default by situation:

- Project kickoff: system context and container diagram.
- New integration or external dependency: system context update.
- New service, deployable unit, data store, worker, or API boundary: container diagram update.
- Medium refactor inside one deployable unit: component diagram only if boundaries are unclear.
- Runtime behavior, async flow, or failure handling decision: sequence or flow diagram when static structure is not enough.
- Deployment, environment, or operational ownership decision: deployment view.
- Code diagram: exceptional; use only when implementation structure is the actual architecture decision.

## Diagram Quality Bar

Each diagram must answer one clear question:

- who uses the system
- which systems interact
- which containers exist
- which component owns a responsibility
- which data or control flow crosses a boundary
- where failure, security, or operational responsibility sits

Each diagram must include:

- title
- scope
- audience
- source Jira issue
- source repo paths when relevant
- related ADR or architecture page
- date or status when published

## C4 Usage Rules

Use stable C4 terms:

- Person: human actor or role.
- Software system: thing that delivers value.
- Container: runnable or deployable unit, data store, application, service, worker, or executable.
- Component: internal building block inside a container.
- Relationship: meaningful dependency or communication path.

Do not mix levels:

- A context diagram should not show internal components.
- A container diagram should not show function-level code.
- A component diagram should not invent separate deployables.

## Diagram As Decision Evidence

If a diagram supports an ADR, the ADR must name what the diagram proves:

- boundary chosen
- dependency accepted
- data ownership chosen
- operational owner chosen
- rejected structure made visible

If the diagram changes implementation safety, sync the link and summary to affected Jira issues.

## Maintenance Rules

Update diagrams when:

- boundary changes
- new container or major component appears
- data ownership changes
- integration contract changes
- deployment topology changes
- ADR supersedes an earlier structure

Do not maintain diagrams that no one uses for decisions, onboarding, validation, or operations.
