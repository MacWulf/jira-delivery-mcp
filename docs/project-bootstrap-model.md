# Project Bootstrap Model

## Cel

Az asszisztens ne csak issue-kat kezeljen, hanem kepes legyen uj Jira projektet is felhuzni kontrollalt modon.

## Ket kulon vilag

### Team-managed / simplified projekt

- gyors indulast ad
- kevesebb admin overhead
- a klasszikus workflow scheme es issue type scheme API-k gyakran ures vagy nem relevans eredmenyt adnak
- jo MVP es kisebb, autonom csapatok szamara

### Company-managed / classic projekt

- kozponti workflow scheme
- issue type scheme
- erosebb admin kontroll
- jobb valasztas, ha tobb projekt kozott egyseges governance kell

## Tenant-aware kovetkezmeny

Gyakorlati kovetkezmeny:

- a klasszikus admin discovery endpointok egy resze elerheto
- de a projektre rendelt scheme-ek team-managed projektnel uresen johetnek vissza
- ezert a bootstrap logikanak kezelnie kell, hogy nem minden projekt klasszikus admin modellel mukodik

## Bootstrap fazisok

### 1. Discovery

- `list_projects`
- `get_project`
- `get_project_admin_snapshot`
- `list_workflow_schemes`

### 2. Bootstrap plan

Az asszisztens eldonti:

- uj projekt kell vagy meglevobe seedeles
- software / business / service_desk projekt kell
- team-managed vagy classic irany kell
- milyen template es milyen alap workflow-politika szukseges

### 3. Project creation

- `bootstrap_project_from_template`
- `bootstrap_software_project`

Az elso koros, ajanlott belepesi pont:

- `bootstrap_software_project`

Ez elrejti a template kulcsokat, es `kanban` vagy `scrum` alapjan valaszt software template-et.

Az alacsonyabb szintu, explicit opcio:

- `bootstrap_project_from_template`

Ez akkor kell, ha pontos template kulcsot akarsz megadni.

### 4. Backlog seed

Kovetkezo iteracioban:

- epic/story/task bontas
- default dependency-k
- kickoff / architecture / delivery ticketek
- optional documentation skeleton

## Biztonsagi modell

- a projekt bootstrap is `dry-run` modban indul
- live letrehozashoz `JIRA_EXECUTION_MODE=live` es `confirm=true` kell
- a projektletrehozas nagy hatasu muvelet, ezert ez kulon write operation
