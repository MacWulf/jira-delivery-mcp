# Architektúra

## Célkép

A rendszer célja, hogy a Codex közvetlenül, toolokon keresztül tudjon Jira- és Confluence-műveleteket végrehajtani, miközben a workflow-szabályok a saját rétegünkben maradnak.

## Fő komponensek

### `services/jira-mcp-server`

Felelősség:

- MCP toolok publikálása Codex felé
- input validáció
- Jira és Confluence API hívások
- alapvető guardrail szabályok kikényszerítése

### Későbbi bővítések

- `services/workflow-policy-service`
  - státuszátmenetek és projekt-specifikus szabályok
- `services/orchestrator`
  - következő ticket kiválasztása, queue, retry, automatikus lépések
- `services/audit-log-service`
  - per-művelet naplózás és visszakereshetőség

## Folyamat

1. A Codex lekéri a releváns ticketeket vagy egy konkrét issue állapotát.
2. A Codex a toolokon keresztül elindítja a munkát (`transition_issue`, `add_comment`, `create_doc_page`).
3. A Jira MCP szerver validálja a bemenetet és REST API-n keresztül végrehajtja a műveletet.
4. A válasz strukturált formában visszakerül a Codexhez.
5. A workflow később bővíthető policy- és orchestration-réteggel.

## Miért nem csak Rovo

- A Rovo jó kiegészítő kereséshez és Atlassian-kontextushoz.
- A teljes életciklus-kezeléshez determinisztikus tool-surface kell.
- A saját rétegben tartható a státuszlogika, a dependency-kezelés és a következő ticket kiválasztási szabályrendszere.

## Guardrailek

- `transition_issue` csak valós Jira transition azonosítóval dolgozhat.
- `pick_next_issue` nem választ lezárt ticketet.
- `link_issues` csak explicit link típussal fut.
- Confluence létrehozás csak akkor engedélyezett, ha a szükséges környezeti változók megvannak.

## Következő iterációk

1. Jira workflow discovery és projektspecifikus státuszmap
2. per-project policy konfiguráció
3. audit log és idempotencia
4. approval gate kritikus műveletekre
5. Rovo MCP kiegészítő kontextusforrásként

