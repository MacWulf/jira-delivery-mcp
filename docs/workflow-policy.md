# Workflow Policy

## Celfolyamat a `KAN` projekthez

A szakmailag ajanlott es a projektben bevezetendo standard delivery workflow:

- `To Do`
- `Selected`
- `In Progress`
- `Blocked`
- `In Review`
- `QA`
- `Done`

## Miert ez a celallapot

- A `To Do` backlog-allapotkent megtartja a nyers vagy meg nem kijelolt munkat.
- A `Selected` csak azokat a ticketeket tartalmazza, amelyek ownership, dependency es readiness szempontbol tenyleg indithatok.
- A `Blocked` kulon lifecycle-allapotot ad a mar elindult, de elakadt munkanak.
- Az `In Review` es a `QA` kulonvalasztja a szakmai reviewt es az acceptance-kriterium alapjan torteno validaciot.
- A `Done` csak ellenorzott befejezes utan hasznalhato.

## Blokkolas kezelese

Hibrid modell:

- explicit Jira `Blocks` issue linkek maradnak az authoritativ dependency-forrasok
- a `Blocked` statusz az aktualis vegrehajtasi allapotot mutatja, ha a munka tenylegesen megallt

Ennek oka:

- a dependency-link mutatja, hogy pontosan mi blokkol
- a `Blocked` statusz mutatja, hogy az issue aktivan nem dolgozhato tovabb
- a kovetkezo issue valasztasnal a link es a statusz egyutt ad megbizhato kepet

## Cel transitionok

- `Create`: uj issue -> `To Do`
- `Select Work`: `To Do` -> `Selected`
- `Start Work`: `To Do` vagy `Selected` -> `In Progress`
- `Mark Blocked`: `Selected`, `In Progress`, `In Review`, `QA` -> `Blocked`
- `Resume Work`: `Blocked` -> `In Progress`
- `Work Done`: `In Progress` -> `In Review`
- `Request Changes`: `In Review` -> `In Progress`
- `Send To QA`: `In Review` -> `QA`
- `QA Failed`: `QA` -> `In Progress`
- `Accepted`: `QA` -> `Done`
- `Return To Do`: `Selected`, `In Progress`, `Blocked`, `In Review`, `QA` -> `To Do`

## Atallitasi elv

A workflow-ujratervezes resze a projektnek, de elo projektet csak kontrollalt validation utan szabad atallitani.

A sorrend:

1. statuszpolitika veglegesitese
2. hianyzo statuszok letrehozasa projekt-scope-ban
3. workflow delta validation
4. Jira workflow-admin valtoztatas
5. asszisztens transition policy frissitese
6. nyitott issue-kon es pick-next logikan utokovetes

## PO iranyelv

A workflow-atallitas utan az authoritativ lanc:

- `To Do -> Selected -> In Progress -> In Review -> QA -> Done`
- oldalag: `In Progress/In Review/QA -> Blocked -> In Progress`

Az asszisztensnek ehhez kell alkalmazkodnia, de transitionnel tovabbra is csak a Jira altal tenylegesen felajanlott atmenetek alapjan dolgozhat.
