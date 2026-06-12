# Done Readiness

Use this checklist before closing an issue.

## Readiness Terms

- `ready for next gate`: the issue can safely advance but is not yet closeable
- `ready for human testing`: assistant-owned validation is complete and the next real stop is a human gate such as `User Testing`
- `ready to close now`: the issue satisfies content, evidence, dependency, and workflow-closeability requirements

## Minimum Readiness

- The requested work is complete.
- Acceptance criteria are met or explicitly waived.
- Any required documentation or notes are added.
- Any required Architect decision, ADR link, hard constraints, affected-work summary, or bounded spike evidence is complete.
- Relevant comments, links, or handoff notes are in place.
- No known blocker remains open on the issue.
- A real `Done` or `Accepted` transition exists from the current workflow state.

## Stronger Readiness

- The change was verified with a check, test, or manual validation.
- Technical QA is complete, and any configured human gate before `Done` has also been satisfied.
- Related child issues are either done or intentionally separated.
- The issue summary and description still reflect the final result.
- The next logical follow-up is clear, if any exists.

## Do Not Close Yet

- The work is only partially complete.
- The result depends on another unresolved issue.
- A mandatory architecture gate, ADR conflict, or bounded spike remains unresolved for affected work.
- The issue lacks evidence that the work was verified.
- A review, approval, or external dependency is still pending.
- The issue is only ready for the next gate such as `In Review`, assistant-owned `QA`, or `User Testing`.
- Jira does not currently expose a real close transition from the issue's current status.
