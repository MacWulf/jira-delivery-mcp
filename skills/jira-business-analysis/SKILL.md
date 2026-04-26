---
name: jira-business-analysis
description: Use when Codex needs to perform business-analysis style discovery, requirement shaping, stakeholder-aware scoping, process analysis, gap analysis, backlog handoff preparation, or Confluence-friendly analysis outputs in a Jira and Confluence workflow. This skill turns vague asks, stakeholder needs, and process-change requests into structured Jira-ready scope, derived acceptance direction, candidate acceptance criteria, decision logs, and bounded discovery outputs without letting questioning sprawl endlessly.
---

# Jira Business Analysis

## Overview

Use this skill to turn a vague request into a bounded, structured business-analysis output that can safely feed Jira backlog work and repo-first Confluence publishing.

This skill is for:
- domain discovery
- problem framing
- stakeholder detection
- as-is and to-be analysis
- scope and risk shaping
- requirement shaping
- Jira handoff preparation
- Confluence-friendly BA notes

This skill is not for:
- day-to-day Jira execution
- workflow administration
- implementation planning after the backlog is already ready
- asking endless exploratory questions without converging

## Operating Model

Work in this order:

1. Detect the domain and request mode.
   Decide whether the ask is mostly discovery, requirement shaping, backlog shaping, or documentation.
2. Enrich context before asking.
   Read repo, Jira, and Confluence context first. If the domain is niche, regulated, or terminology-heavy, use targeted internet research before deeper questioning.
3. Build an interview plan.
   Decide what must still be asked, what can already be inferred, what order to ask in, and what the stop conditions are.
4. Run bounded elicitation.
   Ask one question per message. Each question should resolve one uncertainty, not many.
5. Summarize and checkpoint.
   After every 5 to 10 questions, or when a topic block closes, record what is known, what remains open, and what should not be asked again unless contradicted.
6. Produce a structured BA output.
   End with a Jira-ready and Confluence-friendly analysis package, even if some open questions remain explicit.

Prefer sufficient certainty, not perfect certainty.

## Discovery Interview Loop

### 1. Domain detection

Identify:
- business domain
- problem type
- likely deliverable
- whether the request is discovery-first, backlog-shaping, or documentation-heavy

If the domain is ambiguous and multiple interpretations would materially change the analysis, ask one clarifying question first.

### 2. Context enrichment

Before deeper questioning:
- inspect relevant repo docs
- inspect Jira project or issue context when available
- inspect Confluence project docs when available
- use targeted web research when the domain is specialized, regulated, or unfamiliar enough that weak domain grounding would produce low-quality questions

Use web research only to improve the interview plan. Do not override the user's actual domain reality with generic industry assumptions.

### 3. Interview plan

Build a short internal plan covering:
- domain and problem
- stakeholder presence
- current state
- target state and scope
- constraints and risks
- derived acceptance direction

Mark each topic as:
- already known
- must ask
- optional if time permits

Prefer the smallest set of questions that can unlock a reliable backlog and documentation handoff.

### 4. Bounded elicitation

Questioning rules:
- ask only one question per message
- ask only one decision point per question
- do not ask what the repo, Jira, Confluence, or web research already made clear
- do not repeat a closed question unless the user contradicts earlier information
- once stakeholder presence is answered, treat it as closed and do not ask it again unless the user introduces a different process context or directly contradicts the earlier answer
- stop once the request can be turned into a reliable BA package plus explicit open questions

Default stop guidance:
- no more than 3 major interview rounds
- summarize after 5 to 10 questions, or earlier when a topic block ends
- close discovery when scope, goals, major constraints, and candidate backlog shape are stable enough

## Question Design Rules

- Ask high-impact questions first.
- Prefer short, direct questions over compound prompts.
- Do not force a multiple-choice format when there is no meaningful choice to make.
- Offer a suggestion only when it reduces real ambiguity or speeds up a decision safely.
- Do not ask separate acceptance or validation questions unless the user explicitly wants that discussion. Derive them from prior answers.
- Do not jump into technical solutioning before the business problem is stable.
- If a question would only produce nice-to-have detail and not change the plan, skip it.

## Stakeholder Logic

Stakeholder handling must begin with stakeholder presence, not role decomposition.

Ask this first when stakeholder structure is still unknown:

`Van rajtad kivul mas erdemi resztvevo is a projektben vagy a dontesben, vagy ezt lenyegeben egy ember viszi?`

Ask this at most once per discovery thread.

After the user answers:
- record `stakeholder_presence_status` as `resolved`
- store the resolved value in the latest checkpoint summary
- treat stakeholder presence as a closed topic unless the user later contradicts it or clearly switches to a different workflow segment
- never ask the same presence question again just because later answers mention another person, team, or approver

If the answer is effectively "single owner":
- set `stakeholder_model` to `single-owner`
- record the main business source
- record the likely validator if it differs
- skip deeper stakeholder mapping unless later evidence contradicts this
- do not return to stakeholder-presence questioning in later rounds

If the answer is effectively "multiple stakeholders":
- set `stakeholder_model` to `multi-stakeholder`
- progressively identify only the roles that matter:
  - decision maker
  - daily user
  - input provider
  - approver
  - blocking or constraining actor
- ask follow-up stakeholder role questions only when the missing role information would change scope, backlog handoff, or validation ownership

Do not force all stakeholder categories if the situation is simpler.

See:
- `references/stakeholder-detection.md`
- `references/question-patterns.md`

## Derived Acceptance Logic

Do not run a separate acceptance-and-validation questionnaire by default.

Instead derive acceptance direction from:
- the target state
- the current pain
- stakeholder expectations
- scope boundaries
- constraints and risk

Produce:
- `derived_acceptance_direction`
- `candidate_acceptance_criteria`
- `validation_hints`

The derivation should answer:
- what successful change would look like
- who would consider it good enough
- what evidence would likely prove success

See `references/derived-acceptance.md`.

## Routing Rules

- If the work is mainly project kickoff and initial backlog seeding from a brief, route to `$jira-project-bootstrap`.
- If the work is mainly issue shaping, issue typing, splitting, or readiness cleanup, route to `$jira-intake-refinement`.
- If the work is mainly validation work, failed acceptance, or bug evidence, route to `$jira-quality-control`.
- If the work is mainly Confluence publishing or documentation-governance planning, route to `$jira-documentation-publishing`.
- If the work is already active Jira delivery execution, route to `$jira-execution-loop`.
- If the work is mainly workflow, fields, statuses, or project administration, route to `$jira-workflow-admin`.

Keep this skill as the discovery and analysis layer. Do not let it absorb every other Jira behavior.

## Output Contracts

Produce a compact but structured BA output with:
- `domain_profile`
- `problem_statement`
- `stakeholder_model`
- `current_state`
- `target_state`
- `scope`
- `constraints`
- `risks`
- `assumptions`
- `open_questions`
- `discovery_checkpoints`
- `derived_acceptance_direction`
- `candidate_acceptance_criteria`
- `next_recommended_jira_actions`
- `recommended_confluence_artifact`

Preferred analysis artifacts:
- discovery summary
- business analysis note
- requirements package
- scope decision log
- process analysis note

Every checkpoint summary should include:
- what we learned
- assumptions currently in use
- open questions
- conflicts or ambiguities
- do not ask again unless contradicted

See `references/checkpoint-summaries.md`.

## Guardrails

- Do not invent requirements without a source or a stated assumption.
- Do not confuse a business need with a technical design choice.
- Do not let questioning become unbounded.
- Do not repeat resolved questions unless something changed.
- Do not re-ask the stakeholder-presence question after it has been answered.
- Do not force option lists when a plain question is better.
- Do not overfit to internet research when the user's local process differs.
- Do not claim acceptance is solved if the evidence is still weak; surface explicit open questions instead.
- If a user idea appears weak, risky, or underspecified, say so clearly and constructively.

## Escalation Rules

Pause and surface a decision when:
- multiple domain interpretations remain plausible and would change the backlog
- stakeholder goals conflict
- scope cuts have non-obvious delivery impact
- the remaining unknowns are business-critical and cannot be inferred safely
- the request is drifting from BA discovery into workflow admin or active execution

## References

Load these as needed:
- `references/interview-planning.md`
- `references/domain-onboarding.md`
- `references/checkpoint-summaries.md`
- `references/question-patterns.md`
- `references/stakeholder-detection.md`
- `references/derived-acceptance.md`
