# Product Roadmap

## Purpose

This document captures the public product direction for the repository. It is not a tenant-specific backlog dump; it is a concise view of the capabilities the toolkit is growing toward.

## Current Foundation

- Jira issue create, update, link, comment, and worklog support
- dependency-aware next-issue selection
- workflow discovery and status semantics
- skill metadata embedded in issue descriptions
- kickoff backlog seeding and bootstrap foundations
- dependency drift analysis and relink hygiene
- workflow validation and controlled application
- local secret handling options for secure development

## Active Product Directions

### Workflow Governance

- workflow discovery
- status semantics and transition policy
- migration-safe workflow application
- Definition of Ready and Definition of Done policy layers

### Dependency Control

- blocker snapshots
- dependency-aware issue selection
- stale link detection
- relink hygiene

### Quality Control

- acceptance-criteria-driven test work
- bug evidence and bug linking
- retest loops
- completion logic with quality gates

### Change Control

- change classification
- impact analysis
- reopen, modify, create, and relink decisions

### Traceability and Approval

- decision logs
- audit trails
- approval gates for high-impact actions

## Recommended Next Slices

1. Definition of Ready and Definition of Done policy
2. issue-type enablement strategy
3. quality orchestration
4. change-request control
5. approval and audit formalization

## Product Positioning

This project is not a collection of ad-hoc Jira automation rules.

It aims to provide a Jira-centered operating layer where:

- reasoning happens in skills and policy modules
- execution happens through MCP tools and Jira REST APIs
- workflow, dependency, and quality logic remain explicit and inspectable
