# Product Roadmap

## Cel

Ez a dokumentum a publikus, termek-szintu fejlesztesi iranyt foglalja ossze. Nem tenant-specifikus backlog dump, hanem egy rovid roadmap-nezet arról, hogy milyen kepessegek fele fejlodik a projekt.

## Meglevo alapkepessegek

- Jira issue create, update, link, comment, worklog
- next issue selection dependency-aware logikaval
- workflow discovery es statusz-szemantika
- issue-be irt skill metadata feldolgozasa
- kickoff backlog seed es bootstrap alapok
- dependency drift es relink hygiene
- workflow validation es kontrollalt apply
- DPAPI-backed local secret handling

## Aktiv termekiranyok

### Workflow Governance

- workflow discovery
- statusz-szemantika es transition policy
- migration-safe workflow apply
- DoR / DoD policy reteg

### Dependency Control

- blocker snapshot
- dependency-aware issue selection
- stale link detection
- relink hygiene

### Quality Control

- acceptance criteria alapu tesztmunka
- bug evidence es bug-linking
- retest loop
- done-logika minosegi kapukkal

### Change Control

- valtozasok osztalyozasa
- impact analysis
- reopen / modify / create / relink dontesek

### Traceability And Approval

- dontesi naplo
- audit trail
- approval gate nagy hatasu muveletekhez

## Javasolt kovetkezo szeletek

1. DoR / DoD policy
2. issue type enablement strategy
3. quality orchestration
4. change request control
5. approval gate es audit formalizalasa

## Termekpozicio

Ez a projekt nem egyszeru Jira automation rule gyujtemeny.

A cel egy olyan Jira-kozpontu operacios reteg, ahol:

- a reasoning skill-ekben tortenik
- a vegrehajtas MCP toolokon es Jira REST API-kon megy
- a workflow, dependency es quality logika explicit policykent jelenik meg
