# Operating Model

This skill package should behave like a small Jira operating system, not a single one-off helper.

## Roles

- `jira-core`: route the request and select the right working mode.
- `jira-architect`: decide architecture, create or update ADRs, set hard constraints, block affected work proportionally, and route downstream work to the owning Jira skills.
- `jira-business-analysis`: run bounded discovery, requirement shaping, and stakeholder-aware BA handoff before backlog execution.
- `jira-project-bootstrap`: turn a brief into a Jira project shape, starter backlog, and first delivery slice.
- `jira-intake-refinement`: classify, shape, and ready backlog items.
- `jira-quality-control`: guide implementation with pre-dev test plans, existing test coverage review, validation work, evidence, and retest loops.
- `jira-execution-loop`: pick the next issue, move work forward, and close it safely.
- `jira-workflow-admin`: handle workflow, scheme, and configuration changes.
- `jira-documentation-publishing`: publish repo-first documentation into Confluence and keep the documentation space understandable for human readers.

## Routing Rule

Before acting, determine which of these is true:

- A new project is being bootstrapped from a brief or repo.
- New work is being proposed or cleaned up.
- Architecture decision work is required: kickoff architecture foundation, medium-or-larger refactor, ADR lifecycle, hard constraint, cross-boundary change, contradiction, affected-work blocking, or bounded spike.
- Validation work, bug evidence, retest planning, or code-changing implementation is being shaped.
- Existing work is being executed.
- Jira configuration is being changed.

Then hand off to the narrowest skill that can handle the task.
For architecture-significant work, combine the relevant delivery skill with `jira-architect` before coding or backlog shape is treated as settled.
For code-changing Jira work, combine the execution skill with `jira-quality-control` even when the user did not mention tests.
For project bootstrap, do not stop after backlog seeding when the new backlog contains behavior-changing delivery work. Route those delivery issues to `jira-quality-control` and create or require linked pre-dev test plan issues before ending the turn.

## Output Standard

Every meaningful Jira action should leave a useful audit trail:

- clear issue summary
- concise description
- acceptance criteria or repro steps where needed
- architecture decision link, hard constraints, and affected-work summary when `jira-architect` applies
- a linked pre-dev test plan for code-changing work, or an explicit reason why an existing linked test plan is already current and sufficient
- dependency links when relevant
- structured evidence or validation notes when quality work is involved
- status changes only when the work is actually ready for the next real gate
- if active work has started, the issue must leave `To Do` and receive a concise progress trace
- explicit manual-step notice when the requested Jira action is outside the safe AI or public API capability boundary

Every meaningful Confluence documentation action should leave a usable human-facing result:

- a clear landing page when the documentation set is broad
- dedicated deep-reference pages for major concepts such as each skill or the MCP server
- readable page titles and navigation
- visible owner, status, and review expectations when the page is durable
- explicit distinction between automated behavior, planned behavior, and manual-only behavior
- source references without turning the page into a raw file dump
- deliberate parent-child placement and taxonomy instead of flat page sprawl

If the assistant has started substantive implementation for a Jira issue, the issue should no longer appear untouched in Jira:

- move it out of `To Do` or equivalent backlog state through a real Jira transition
- leave a concise start or progress trace
- do not create the appearance of active delivery in code while Jira still shows backlog state

## Gate-Aware Progression

The Jira skill set should behave like a small professional delivery team:

- activate the issue before substantive implementation starts
- leave a concise progress trace
- run the validations the assistant can really perform
- resolve any mandatory architecture gate through `jira-architect` before treating affected implementation as unblocked
- attach or summarize the evidence that supports advancement
- move the issue to the next valid workflow state
- continue until a real blocker appears

Valid stopping points are:

- evidence is insufficient
- a dependency or policy block remains open
- a mandatory architecture decision, ADR conflict, or bounded spike remains unresolved for affected work
- Jira does not expose a safe transition for the next move
- the issue has reached an explicit human gate
- the issue has reached `Done`

Do not stop merely because coding is finished if the next workflow step is still executable.

## Gate Precedence

Human-gated statuses should be interpreted in this order:

1. execution metadata
2. labels
3. workflow default

Default behavior:

- if the workflow includes `User Testing`, that is the default human gate
- if the workflow does not include `User Testing`, fall back to `QA`
- `In Review` is not human-only by default
- `QA` is not human-only by default once `User Testing` exists
- do not stop at `In Review` or `QA` just because the status name implies review; stop only when the remaining gate actually requires a person or Jira exposes no further safe assistant-owned move
- in legacy workflows without `User Testing`, `QA` is only a stopping point when the remaining validation is not assistant-executable

## Closure Language

Use these phrases precisely:

- `ready for next gate`: the issue can advance, but not yet close
- `ready for human testing`: technical validation is complete and the next real stop is human-owned
- `ready to close now`: the issue is content-complete, evidence-complete, dependency-clear, has satisfied prior gates, and Jira exposes a real `Done` or `Accepted` transition from the current state

Do not collapse these meanings into a generic "ready" or "closable" label.

## Defect Traceability

When failed validation, violated acceptance, or readiness mismatch turns into a bug:

- link the created bug directly to every affected issue
- link the validation issue when one exists
- keep any parent epic or capability only as supporting hierarchy
- state which acceptance criterion or expected behavior was violated

Traceability is incomplete if only the parent hierarchy is preserved.

## Backlog Discipline

Use Jira as the source of truth for delivery state.

Keep intake work separate from execution work so that the backlog can stay clean and the active queue can stay small.
