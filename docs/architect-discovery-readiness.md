# Architect Release Readiness

## Purpose

This checklist defines when the Architect capability is ready for public release.

It replaces private discovery tracking with public release criteria.

## Required Skill Files

The release must include:

- `skills/jira-architect/SKILL.md`
- `skills/jira-architect/agents/openai.yaml`
- `skills/jira-architect/references/activation-and-decision-levels.md`
- `skills/jira-architect/references/adr-sync-contract.md`
- `skills/jira-architect/references/architecture-best-practices.md`
- `skills/jira-architect/references/diagramming.md`
- `skills/jira-architect/references/migration-and-evolution.md`

The skill must not depend on private project docs, local absolute paths, or private tenant URLs.

## Required Behavior

The Architect skill must support:

- project kickoff activation
- medium refactor activation
- advisory versus mandatory-gate decisions
- bounded spike fallback
- ADR creation and update guidance
- hard constraints
- rejected alternatives
- proportional affected-work blocking
- Jira and Confluence sync expectations
- downstream Jira skill routing
- no artificial user-testing gate for assistant-verifiable work

## Validation Checklist

Before release:

- validate `jira-architect`
- validate all bundled Jira skills
- run TypeScript check
- run TypeScript build
- run available tests
- scan tracked files for private URLs, internal issue keys, personal data, secrets, and local machine paths
- confirm README and package metadata show the release version
- confirm GitHub links target the public release repository

## Public Documentation Checklist

Public docs must:

- explain what the Architect skill does
- avoid private Jira or Confluence links
- avoid internal ticket keys
- avoid private planning history
- remain useful without access to the author's Jira tenant
- separate durable release guidance from implementation notes
