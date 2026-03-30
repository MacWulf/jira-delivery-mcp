# Product Backlog

## Scope

Ez a dokumentum a `KAN` fejlesztoi projekt authoritativ backlog-nezetet irja le. A `TEST` tovabbra is a dedikalt integracios es live validacios projekt.

## Backlog Epochs

### 1. Legacy seed backlog

Korai seed allapot:

- `KAN-9`..`KAN-24`

Ez a vonal mar le van zarva es `legacy-seed` + `superseded` jelolest kapott. Tortenetileg hasznos, de mar nem authoritativ fejlesztesi forras.

### 2. Implementalt MVP kepessegek

Megerkezett, tenylegesen implementalt retegek:

- `KAN-25` Codex kickoff blueprint and project bootstrap
- `KAN-26` Define reusable kickoff blueprint schema and validation rules
- `KAN-27` Bootstrap Jira project from kickoff blueprint
- `KAN-28` Seed initial Jira backlog from kickoff blueprint
- `KAN-29` Workflow and execution orchestration
- `KAN-30` Discover project workflow and transition policy dynamically
- `KAN-31` Model dependency graph and blocked-work rules
- `KAN-32` Start next issue and advance work lifecycle safely
- `KAN-33` Operational safety, validation and documentation
- `KAN-34` Secure local Jira credentials with DPAPI-backed storage
- `KAN-35` Provision dedicated TEST Jira project for live validation flows
- `KAN-36` Document kickoff runbook, audit trail and operator guardrails

## Current Next-Phase Roadmap

Ez a jelenlegi strategiai fejlesztesi irany, a capability map alapjan seedelve:

### Workflow Governance

- `KAN-37` Epic: Adaptive workflow governance es lifecycle policy
- `KAN-38` Story: Aktiv workflow, statusz semantics es transition policy feltarasa
- `KAN-39` Story: Definition of Ready es Definition of Done policy reteg bevezetese
- `KAN-40` Story: Workflow delta terv, migration logika es audit-safe alkalmazas

### Dependency Control

- `KAN-56` Epic: Dependency control es graph-aware execution
- `KAN-57` Story: Dependency graph semantics, blocker snapshot es eligible-work policy
- `KAN-58` Story: Dependency drift detection, relink hygiene es stale-link jelzes
- `KAN-59` Story: Dependency-aware next issue sequencing es statusz-osszehangolas

### Quality Control

- `KAN-41` Epic: Quality control, teszt orchestration es bug evidence
- `KAN-42` Story: Acceptance kriteriakbol test work itemek generalasa es linkelese
- `KAN-43` Story: Failed validation eseten bug nyitas, evidence csatolas es statuszkorrekcio
- `KAN-44` Story: Retest loop, acceptance verification es evidence-aware done logika

### Change Control

- `KAN-45` Epic: Change request orchestration es scope evolution control
- `KAN-46` Story: Bejovo valtozasok osztalyozasa: CR, bug, reopen vagy uj scope
- `KAN-47` Story: Impact analysis a scopevaltozasokhoz, dependency-khez es release sorrendhez
- `KAN-48` Story: Change plan alkalmazasa: reopen, modify, create es relink

### Traceability And Approval

- `KAN-49` Epic: Traceability, approval gate es audit trail
- `KAN-50` Story: Dontesi naplo es valtozasi nyom brieftol issue-ig
- `KAN-51` Story: Approval gate nagy hatasu workflow- es scope-muveletekre

## Current Active Work

Jelenleg az aktiv, authoritativ munkafolyam:

- `KAN-38` `In Review`
- `KAN-40` `QA`
- `KAN-58` `In Review`
- `KAN-39` `To Do`
- `KAN-59` `To Do`

Ez az elso strategiai story a workflow governance modulban, es innen nyilik meg a kovetkezo fazis:

- `KAN-39`
- `KAN-59`

Ezzel parhuzamosan a dependency control alapreteg mar hasznalhato szeletben all:

- `KAN-57` `Done`
- `KAN-58` `In Review`
- `KAN-59` `To Do`

Kulon, meg nyitott dokumentacios maradek:

- `KAN-36`

Ez nem resze a capability-roadmap epic-lancnak, de tovabbra is ertekes operatori dokumentacios feladat.

## Dependency Logic

A capability-roadmap explicit `Blocks` linkekkel lett seedelve. A fo logika:

- `KAN-38` blokkolja `KAN-39`-et
- `KAN-39` blokkolja `KAN-43`-at
- `KAN-57` blokkolja `KAN-58`-at es `KAN-59`-et
- `KAN-58` blokkolja `KAN-59`-et
- `KAN-57` blokkolja `KAN-47`-et
- `KAN-42` blokkolja `KAN-43`-at
- `KAN-43` blokkolja `KAN-44`-et es `KAN-50`-et
- `KAN-46` blokkolja `KAN-47`-et
- `KAN-47` blokkolja `KAN-48`-at es `KAN-51`-et
- `KAN-40` blokkolja `KAN-51`-et
- `KAN-48` blokkolja `KAN-50`-et

## Recommended Implementation Order

Ha a projektet a most megbeszelt irany szerint visszuk tovabb, a javasolt sorrend:

1. `KAN-38`
2. `KAN-40`
3. `KAN-39`
4. `KAN-57`
5. `KAN-58`
6. `KAN-59`
7. `KAN-42`
8. `KAN-43`
9. `KAN-44`
10. `KAN-46`
11. `KAN-47`
12. `KAN-48`
13. `KAN-50`
14. `KAN-51`
15. `KAN-36`

## PO Position

A Jira asszisztens kovetkezo szintje mar nem csak delivery automation:

- workflowt ertelmez es szukseg eseteben kontrollaltan formal
- dependency-ket explicit graphkent kezel es karbantart
- acceptance kriteriat teszttel, evidence-szel es bugfolyamattal kot ossze
- scope-valtozast explicit change controlkent kezel
- dontesi naplot es audit trailt hagy maga utan

Ez a pont valasztja el az okos szakertot a sima Jira-mutaciotol.
