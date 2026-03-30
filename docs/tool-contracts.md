# Tool Contractok

## MVP toolkeszlet

### `list_projects`

- Cel: lathato Jira projektek listazasa
- Kotelezo input: nincs
- Kimenet: elerheto projektek listaja
- Guardrail: csak olvasasi muvelet

### `get_project`

- Cel: projekt metaadatok lekerese
- Kotelezo input: `projectKey`
- Kimenet: projekt reszletei
- Guardrail: csak olvasasi muvelet

### `get_project_admin_snapshot`

- Cel: projekt admin snapshot lekerese
- Kotelezo input: `projectKey`
- Kimenet: projekt metaadatok, workflow scheme es issue type scheme kontextus
- Guardrail: csak olvasasi muvelet

### `list_workflow_schemes`

- Cel: elerheto workflow scheme-ek listazasa
- Kotelezo input: nincs
- Kimenet: workflow scheme lista
- Guardrail: csak olvasasi muvelet

### `discover_project_workflow`

- Cel: projekt workflow discovery snapshot lekerese statuszokkal, sampled transitionokkel es statusz-szemantikaval
- Kotelezo input: `projectKey`
- Kimenet: management model, issue type/status snapshot, transition mintak es policy hint-ek
- Guardrail: csak olvasasi muvelet, a tenant tenyleges workflowjat mintazza es nem feltetelez klasszikus scheme adatot

### `preview_standard_project_workflow`

- Cel: a standard Codex-managed workflow delta es validation eredmenyenek elozetes megtekintese
- Kotelezo input: `projectKey`
- Kimenet: target statuszok, workflow update payload es validation eredmeny
- Guardrail: csak olvasasi muvelet, nem publishol workflowt

### `apply_standard_project_workflow`

- Cel: a standard Codex-managed workflow project-szintu alkalmazasa
- Kotelezo input: `projectKey`
- Kimenet: validalt es publisholt workflow update eredmenye
- Guardrail: alapbol dry-run, live modban explicit `confirm=true` kell

### `preview_standard_project_workflow`

- Cel: a standard delivery workflow delta read-only tervezese es validalasa projekt-szinten
- Kotelezo input: `projectKey`
- Kimenet: cel statuszok, transitionok, ujrafelhasznalt vagy ujonnan letrehozando statuszok, valamint a Jira workflow update validation eredmenye
- Guardrail: nem publishol workflow-t, csak ellenorzi az alkalmazhatosagot

### `apply_standard_project_workflow`

- Cel: a standard `To Do -> Selected -> In Progress -> Blocked -> In Review -> QA -> Done` workflow tenyleges alkalmazasa
- Kotelezo input: `projectKey`
- Kimenet: publisholt workflow delta, validation eredmeny es a letrehozott statuszok listaja
- Guardrail: alapbol dry-run, live modban explicit `confirm=true` kell

### `analyze_dependency_drift`

- Cel: dependency drift, duplicate blokkok, stale link candidate-ek es expected-vs-actual dependency eltetesek read-only auditja
- Kotelezo input: `projectKey` vagy `jql`
- Kimenet: missing es unexpected dependency-k, duplicate edge-ek, stale dependency candidate-ek es blocked-status konfliktusok
- Guardrail: csak olvasasi muvelet, relink vagy unlink javaslatot ad, de nem torol es nem linkel automatikusan

### `get_issue`

- Cel: egy issue reszletes lekerdezese
- Kotelezo input: `issueKey`
- Kimenet: issue mezok, statusz, execution metadata, dependency snapshot es dependency-status signalok
- Guardrail: csak olvasasi muvelet

### `search_issues`

- Cel: issue-k lekerdezese JQL alapjan
- Kotelezo input: `jql`
- Kimenet: issue lista kulcsmezokkel
- Guardrail: felso korlat a `maxResults` mezon

### `bootstrap_project_from_template`

- Cel: uj Jira projekt letrehozasa explicit template es project type alapjan
- Kotelezo input: `key`, `name`, `projectTypeKey`, `projectTemplateKey`
- Kimenet: letrehozott projekt metadatai vagy dry-run payload
- Guardrail: alapbol dry-run, live modban explicit `confirm=true` kell

### `bootstrap_software_project`

- Cel: uj software projekt letrehozasa magasabb szintu delivery modellel
- Kotelezo input: `key`, `name`
- Kimenet: letrehozott projekt metadatai vagy dry-run payload
- Guardrail: alapbol `team-managed` + `kanban` irany, live modban explicit `confirm=true` kell

### `create_issue`

- Cel: uj Jira issue letrehozasa
- Kotelezo input: `summary`, `issueType`
- Kimenet: letrehozott issue kulcs es URL
- Guardrail: projektkulcs nelkul csak default projektre enged

### `update_issue`

- Cel: mezok frissitese meglevo issue-n
- Kotelezo input: `issueKey`
- Kimenet: sikeres frissites visszaigazolasa
- Guardrail: csak explicit mezofrissitesek futnak

### `get_transitions`

- Cel: ervenyes statuszatmenetek lekerdezese
- Kotelezo input: `issueKey`
- Kimenet: transition lista azonositoval es nevvel
- Guardrail: nem feltetelez workflow-t, mindig Jira-bol kerdezi le

### `transition_issue`

- Cel: statuszvaltas
- Kotelezo input: `issueKey`, `transitionId`
- Kimenet: sikeres transition visszaigazolasa
- Guardrail: csak Jira altal visszaadott transition ID hasznalhato

### `transition_issue_by_name`

- Cel: statuszvaltas emberi olvashato transition nev alapjan
- Kotelezo input: `issueKey`, `transitionName`
- Kimenet: a feloldott transition es a vegrehajtasi eredmeny
- Guardrail: csak az issue-hoz tenylegesen elerheto transition nev fogadhato el

### `link_issues`

- Cel: dependency vagy kapcsolati link letrehozasa
- Kotelezo input: `typeName`, `inwardIssueKey`, `outwardIssueKey`
- Kimenet: sikeres linkeles visszaigazolasa
- Guardrail: onmagara linkeles tiltott

### `delete_issue_link`

- Cel: Jira issue link torlese link ID alapjan relink hygiene vagy drift-javitas celjabol
- Kotelezo input: `linkId`
- Kimenet: sikeres torles visszaigazolasa
- Guardrail: live modban explicit `confirm=true` kell, es audit-safe hasznalat csak drift elemzes utan ajanlott

### `get_issue_link_types`

- Cel: elerheto issue link tipusok lekerese
- Kotelezo input: nincs
- Kimenet: link tipus lista
- Guardrail: csak olvasasi muvelet

### `add_comment`

- Cel: komment hozzaadasa issue-hoz
- Kotelezo input: `issueKey`, `comment`
- Kimenet: komment azonosito es URL
- Guardrail: ures komment tiltott

### `add_worklog`

- Cel: worklog hozzaadasa issue-hoz
- Kotelezo input: `issueKey`, `timeSpentSeconds`
- Kimenet: worklog visszaigazolas
- Guardrail: live modban explicit megerosites kell

### `pick_next_issue`

- Cel: kovetkezo feldolgozando issue kivalasztasa
- Kotelezo input: nincs
- Kimenet: egy ajanlott issue, execution ordering, dependency snapshot, status signalok, dependency miatt blokkolt es workflow-szinten blokkolt jeloltek listaja
- Guardrail: csak nem lezart es nem `Blocked` lifecycle-allapotban levo issue johet szoba

### `seed_project_kickoff`

- Cel: egy ujrahasznalhato Codex-managed kickoff backlog felhuzasa a projektbe
- Kotelezo input: nincs, ha van default projekt
- Kimenet: letrehozott vagy ujrahasznalt issue-k, dependency-k es az elinditott elso issue
- Guardrail: live modban explicit `confirm=true` kell, es az elso munkatetel csak nem blokkolt issue lehet

### `start_issue_work`

- Cel: egy nem blokkolt issue munkainditasa
- Kotelezo input: `issueKey`
- Kimenet: a feloldott in-progress transition
- Guardrail: done vagy blokkolt issue nem indithato el

### `select_issue_for_work`

- Cel: issue mozgatasa a `Selected` ready queue-ba
- Kotelezo input: `issueKey`
- Kimenet: a feloldott selected transition
- Guardrail: done vagy dependency-altal blokkolt issue ne keruljon `Selected` allapotba

### `handoff_issue`

- Cel: issue review vagy handoff allapotba mozgatasa
- Kotelezo input: `issueKey`
- Kimenet: a feloldott review transition
- Guardrail: csak a tenantban tenyleg letezo review jellegu transition hasznalhato

### `send_issue_to_qa`

- Cel: issue mozgatasa a `QA` validacios fazisba
- Kotelezo input: `issueKey`
- Kimenet: a feloldott QA transition
- Guardrail: blokkolt issue ne menjen QA-ba, es csak a tenylegesen letezo QA transition hasznalhato

### `mark_issue_blocked`

- Cel: issue explicit `Blocked` allapotba rakasa
- Kotelezo input: `issueKey`, `comment`
- Kimenet: a feloldott blocked transition
- Guardrail: indoklo komment kotelezo, live modban explicit megerosites kell

### `close_issue_if_ready`

- Cel: issue lezarasa readiness checklist alapjan
- Kotelezo input: `issueKey`, `testsPassed`, `docsUpdated`, `reviewComplete`
- Kimenet: a feloldott done transition
- Guardrail: a checklist minden eleme igaz legyen, es az issue ne legyen blokkolt

### `create_doc_page`

- Cel: dokumentacios oldal letrehozasa Confluence-ben
- Kotelezo input: `spaceId`, `title`, `bodyStorage`
- Kimenet: letrehozott oldal azonosito es URL
- Guardrail: csak konfiguralt Confluence kapcsolat eseten aktiv

## Live irasi szabaly

- Az iro toolok alapbol `dry-run` modban futnak.
- Live modban az irashoz `confirm=true` kell.
- A kontrollalt live tesztfolyam csak explicit `JIRA_TEST_PROJECT_KEY` mellett fut.
