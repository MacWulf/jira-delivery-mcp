# Jira Issue Skill Metadata

Ez a spec azt definialja, hogyan kell Jira issue leirasaba beirni a szukseges es optionalis skilleket, hogy a Codex a vegrehajtas elott fel tudja oldani a megfelelo skill stack-et.

## Cel

- A ticket ne csak leirja a munkat, hanem jelezze azt is, milyen Codex skill(ek) kellenek a vegrehajtasahoz.
- A metadata segitse a routingot, de ne helyettesitse a ticket tartalmat.
- A formatum legyen egyertelmu, gepileg olvashato es tenant-aware.

## Elhelyezes

A skill metadata a Jira issue `Description` reszeben jelenjen meg, egy kulon, jol elkulonulo blokkban.

Javasolt szerkezet:

    ## Execution metadata

    ```yaml
    codex:
      required_skills:
        - jira-project-bootstrap
        - jira-intake-refinement
      optional_skills:
        - jira-workflow-admin
      execution_mode: dry-run
    ```

## Javasolt Format

Hasznald a kovetkezo szerkezetet a metadata blokkban:

```yaml
codex:
  required_skills:
    - jira-core
    - jira-execution-loop
  optional_skills:
    - jira-project-bootstrap
  execution_mode: implement
  notes: "Optional short routing note"
```

### Fields

- `required_skills`
  A vegrehajtaskor kotelezoen betoltendo skillek listaja.
- `optional_skills`
  Olyan skillek, amelyek hasznosak lehetnek, de nem blokkoljak a vegrehajtast.
- `execution_mode`
  Optionalis jelzes arra, hogy a task `dry-run`, `implement`, `review`, vagy `admin` jellegu.
- `notes`
  Rogvid, emberi olvashato megjegyzes a routinghoz.

## Olvasasi Szabalyok

- A Codex eloszor mindig a ticket tartalmat olvassa, majd utana oldja fel a skill metadata-t.
- Ha a skill nem elerheto lokalisan, ezt jelezni kell, nem szabad helyettesiteni talalgatassal.
- A `required_skills` nem tanacs, hanem vegrehajtasi elvartas.
- Az `optional_skills` csak akkor hasznalando, ha relevansak, es nem novelik feleslegesen a kontextust.

## Biztonsagos Hasznalat

- Ne tegyel a skill metadata-ba bizalmas informaciot.
- Ne hasznald a metadata blokkot feladatleiras helyett.
- Ne sorolj fel minden elkepzelheto skillt, csak azokat, amelyek tenyleg kellenek.
- Ne hasznald a blokkot workflow vagy approval policy megkerulesere.
- A metadata csak routing-hint, nem jogosultsagi mechanizmus.

## Javasolt Hasznalat

### Projekt bootstrap

```yaml
codex:
  required_skills:
    - jira-core
    - jira-project-bootstrap
  optional_skills:
    - jira-intake-refinement
  execution_mode: dry-run
```

### Backlog refinement

```yaml
codex:
  required_skills:
    - jira-core
    - jira-intake-refinement
  optional_skills:
    - jira-workflow-admin
  execution_mode: refine
```

### Delivery loop

```yaml
codex:
  required_skills:
    - jira-core
    - jira-execution-loop
  optional_skills:
    - jira-workflow-admin
  execution_mode: implement
```

## Fallback

Ha nincs metadata blokk, a Codex a ticket szovegebol es a projekt kontextusabol inferalja a szukseges skilleket.

Ha van metadata blokk, az elsobbseget elvezi az inferenciaval szemben, feltve hogy nem ellentmondasos.

