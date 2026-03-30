# Helyi Skill Teszteles

Ez az utmutato azt mutatja meg, hogyan probald ki helyben a Jira skill csomagot Codexben, biztonsagos sorrendben.

## Mire Van Szukseg

- A repo legyen lefordithato: `npm install`
- A Jira token legyen DPAPI-val tarolva
- A `.env`-ben legyen beallitva legalabb:
  - `JIRA_BASE_URL`
  - `JIRA_EMAIL`
  - `JIRA_API_TOKEN_DPAPI_FILE`
  - `JIRA_DEFAULT_PROJECT_KEY`
  - `JIRA_TEST_PROJECT_KEY`
- Legyen kulon validacios projekt a kontrollalt live probakhoz
- A fo delivery projekt maradjon tiszta a validacios irasoktol

## Elerheto Skillek

- `jira-core`: router, tenant-aware alaplogika
- `jira-project-bootstrap`: projekt briefbol indul Jira struktura
- `jira-intake-refinement`: issue osztalyozas, bontas, readiness
- `jira-execution-loop`: napi delivery loop, kovetkezo ticket, zaras
- `jira-workflow-admin`: workflow, statuszok, admin policy

## Jira Issue Skill Metadata

Ha a ticket description tartalmaz skill metadata blokkot, a Codex azt olvassa ki eloszor, es ahhoz igazitsa a vegrehajtasi skill stack-et.

Javasolt szerkezet a Jira issue descriptionben:

    ## Execution metadata

    ```yaml
    codex:
      required_skills:
        - jira-core
        - jira-project-bootstrap
      optional_skills:
        - jira-intake-refinement
      execution_mode: dry-run
    ```

A reszletes specifikacio itt van: [jira-issue-skill-metadata.md](./jira-issue-skill-metadata.md)

## Javasolt Tesztelesi Sorrend

1. Ellenorizd, hogy a Jira kapcsolat mukodik.
2. Probald ki a bootstrap skillt dry-run modban.
3. Probald ki az intake skillt egy valos briefen.
4. Probald ki az execution skillt egy nyitott ticketen.
5. Csak ezutan menj live modba a dedikalt validacios projektben.
6. A fo delivery projektet csak akkor hasznald live irashoz, ha mar stabil a flow.

## Prompt Mintak

### 1. Bootstrap dry-run

```text
Hasznald a $jira-project-bootstrap skillt. Van egy uj projektbriefem, ebbol szeretnek Jira projekt strukturat es indulou backlogot. Eloszor dry-runban add meg, milyen epic-ek, story-k es task-ok kellenenek, valamint mi legyen az elso delivery slice.
```

### 2. Intake refinement

```text
Hasznald a $jira-intake-refinement skillt. Ezt a backlogot szeretnem tisztazni, osztalyozni es readiness szerint rendezni. Szedd szet a tobbcelu elemeket, javasolj parent kapcsolatokat, es mondd meg, mi nem ready meg.
```

### 3. Execution loop

```text
Hasznald a $jira-execution-loop skillt. Valaszd ki a kovetkezo nem blokkolt ticketet, ellenorizd a transitionoket, majd vezess vegig rajta egy tiszta delivery loopot kommenttel, handoffal es megfelelo zarassal.
```

### 4. Workflow admin

```text
Hasznald a $jira-workflow-admin skillt. A jelenlegi workflowt szeretnem atgondolni, es ha kell, uj statuszokat, transitionoket vagy required field policyt javasolni tenant-aware modon.
```

### 5. Project bootstrap

```text
Hasznald a $jira-core es $jira-project-bootstrap skilleket. Egy uj projektet akarok felhuzni briefbol. Adj egy minimalis, de hasznalhato Jira kezdoszerkezetet, es csak annyi ticketet seedelj, amennyivel azonnal el lehet kezdeni a munkat.
```

### 6. Jovahagyott tervbol Jira issue lista

```text
Hasznald a $jira-core, $jira-project-bootstrap es $jira-intake-refinement skilleket. A brief alapjan mar van egy jovahagyott bootstrap tervunk. Alakitsd at konkret Jira issue listava: 1 epic, starter story-k, day-one taskok, explicit dependency-k, es jelold meg, melyik legyen az elso aktiv ticket a validacios projektben.
```

### 7. Skill metadata-vel jelolt ticket olvasasa

```text
Hasznald a $jira-core es $jira-execution-loop skilleket. Olvasd be a Jira issue leirasat, oldd fel a benne talalhato skill metadata blokkot, majd a required skills alapjan valaszd ki a vegrehajtashoz szukseges skilleket. Ha a metadata hianyzik vagy ellentmondasos, jelezd ezt eloszor.
```

## Biztonsagos Elohaladas

- Kezdd `dry-run` modban.
- Eloszor csak olvassatok, ne irjatok.
- Live irashoz csak a dedikalt validacios projektet hasznald.
- Ha a workflow vagy a statuszok nem egyertelmuek, eloszor olvasd ki a Jira valos transition listajat.
- A `Done` statuszt csak akkor hasznald, ha a work tenyleg kesz.

## Mit Varj Az Elso Teszttol

- helyes issue tipus-besorolas
- ertelmes parent/child szerkezet
- kis, indulhato backlog
- atgondolt elso delivery slice
- biztos dry-run, mielott barmi live iras tortenik

## Atlepes Live Irashoz

Ha a dry-run backlog jonak tunik, a kovetkezo helyi prompttal lehet tovabblepni a tenyleges Jira iras fele a dedikalt validacios projektben:

```text
Hasznald a $jira-core, $jira-project-bootstrap es $jira-intake-refinement skilleket. A C:\\Codex\\Jira_integration\\fixtures\\sample-project-brief.md brief alapjan keszits konkret Jira issue listat, majd hozz letre csak a minimalis indulou backlogot a dedikalt validacios projektben. Eloszor ellenorizd a duplikaciokat es a valid issue type-okat, utana dolgozz. Ha valami nem egyertelmu, allj meg az iras elott.
```

## Gyors Metadata Teszt

Ha kifejezetten azt akarod ellenorizni, hogy a Jira issue descriptionben tarolt skill metadata visszaolvashato-e, futtasd:

`npm run skill-metadata-live-test`

Ez a dedikalt validacios projektben letrehoz egy kontrollalt issue-t, beirja a skill metadata blokkot, visszaolvassa, majd riportot keszit az `artifacts` mappaba.
