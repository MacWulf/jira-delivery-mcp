# Jira Assistant Operating Model

## Source of truth

- A feladatok forrasa a Jira.
- A kod es a kapcsolodo artefaktumok forrasa a repository.
- A dokumentacios allapot forrasa elsokorben a repository, kesobb opcionalisan Confluence.

## Environment separation

- A napi fejlesztoi munka alap projektje `KAN`.
- A kontrollalt live tesztek es irasi probak celprojektje `TEST`.
- A technikai tesztek ne szemeteljek tele a fejlesztoi projektet, ha van dedikalt tesztprojekt.

## Core loop

1. Az asszisztens beolvassa a projektet vagy az aktualis briefet.
2. Ellenorzi a projektet, az issue struktutat es a nyitott dependency-ket.
3. Ha hianyzik bontas, letrehoz epic, story, task vagy sub-task szerkezetet.
4. Linkeli a dependency-ket explicit Jira issue linkekkel.
5. Kivalasztja a kovetkezo nem blokkolt, nem lezart issue-t.
6. Lekeri a valid transitionoket, majd elinditja a munkat.
7. Munka kozben kommentel, worklogol es dokumental.
8. Munka vegen a ticketet megfelelo allapotba mozgatja.
9. Ujra kivalasztja a kovetkezo relevans issue-t.

## Required assistant behaviors

### Planning

- Eloszor olvasson, utana irjon.
- Ne gyartson ticketet duplikacio ellenorzes nelkul.
- A nagyobb celokat bontsa kezelheto, egymasra epulo ticketekre.
- Ha a ticket description tartalmaz skill metadata blokkot, azt a vegrehajtas elott oldja fel es hasznalja routing jelzesnek.

### Execution

- Minden iras elott kerje le az aktualis issue allapotat.
- Statuszvaltasnal ne feltetelezzen workflow-t; mindig a Jira transition listabol dolgozzon.
- Blokkolt issue-t ne inditson el, csak jelezze vagy oldja a dependency-t.
- `Selected` nelkul a `To Do` issue altalaban nem szamitson kovetkezo indithato munkanak, ha van mar elokeszitett `Selected` tetel.
- `Blocked` statuszt csak explicit blockerrel es lehetoseg szerint `Blocks` linkkel egyutt hasznaljon.
- A required skills metadata az issue vegrehajtasi kontraktus resze, nem puszta ajanlas.

### Documentation

- Minden fontos dontest vagy allapotvaltozast kommenttel vagy dokumentummal tamasszon ala.
- A dokumentacio ne csak leiras legyen, hanem kovetheto dontesi nyom.

### Prioritization

- Elonyben a nem blokkolt, magas prioritasu ticket.
- Done kategoriaba eso issue ne legyen ujra kivalasztva.
- Ha nincs feldolgozhato issue, azt kulon allapotkent jelezze.

## Safety model

- Az iro muveletek alapbol `dry-run` modban futnak.
- Live modban `confirm=true` kell az irashoz.
- A tenant-specifikus workflow-kat nem szabad beegetett feltetelezesekkel kezelni.
- A live smoke es end-to-end tesztek a `JIRA_TEST_PROJECT_KEY` projektet hasznaljak, ha be van allitva.

## Practical tool sequence

### New project setup

- `list_projects`
- `get_project`
- `get_project_admin_snapshot`
- `bootstrap_software_project`
- `search_issues`
- `create_issue`
- `link_issues`

### Starting work on the next item

- `pick_next_issue`
- `get_issue`
- `get_transitions`
- `select_issue_for_work`
- `start_issue_work`

### During execution

- `update_issue`
- `add_comment`
- `add_worklog`
- `create_doc_page`

### Closing or handing off

- `handoff_issue`
- `send_issue_to_qa`
- `mark_issue_blocked`
- `close_issue_if_ready`
- `add_comment`

## Next maturity steps

- [Capability map](./capability-map.md)
- project-specific policy config
- approval gate workflow-admin es migration jellegu lepesekhez
- automatikus duplicate detection
- richer backlog health checks
