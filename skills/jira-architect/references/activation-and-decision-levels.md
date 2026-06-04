# Activation And Decision Levels

Use this reference when deciding whether Architect should activate and how strongly it should constrain work.

## Activate

Activate Architect for:

- project kickoff or new delivery stream
- medium-or-larger refactor
- cross-module, cross-service, storage, integration, API, auth, workflow, deployment, or data-flow change
- ADR create, update, supersede, review, or conflict check
- suspected contradiction with active architecture decision
- low-confidence design choice that needs bounded spike evidence
- hard constraint needed before implementation
- affected Jira work needs block, unblock, ADR link, or architecture summary
- Confluence architecture page or ADR taxonomy needs sync

## Do Not Activate

Do not activate for:

- typo or wording-only change
- small local implementation detail
- isolated test-only or QA-only work with no architecture contradiction
- documentation-only cleanup with no architecture content drift
- routine Jira status movement

## Decision Levels

- Advisory:
  Architecture guidance is useful but execution is not blocked.
- Mandatory gate:
  Affected work must not continue until decision, ADR, hard constraints, and sync are complete.
- Spike-needed:
  Confidence is too low. Create or propose bounded spike work and block affected implementation until evidence exists.

## User Questions

Decide by default.

Ask the user only when:

- the user explicitly pre-authorized consultation
- automatic decision would be very high-risk
- evidence is too weak and bounded spike cannot reduce uncertainty enough
- multiple active ADRs conflict and automatic supersession would be unsafe

When offering options, recommend one option and give one short reason.
