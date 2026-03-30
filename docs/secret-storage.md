# Secret Storage

## Cel

Az API tokenek ne plain text formaban legyenek a helyi `.env` fajlban.

## Tamasztott modok

### Plain text env

- `JIRA_API_TOKEN`
- `CONFLUENCE_API_TOKEN`

Ez a visszafele kompatibilitas miatt tamogatott, de helyi gepen nem ez az ajanlott vegallapot.

### Windows DPAPI fajl

- `JIRA_API_TOKEN_DPAPI_FILE`
- `CONFLUENCE_API_TOKEN_DPAPI_FILE`

Ebben a modban a token egy, a jelenlegi Windows userhez kotott, DPAPI-val vedett fajlban van.

## Ajanlott helyi beallitas

1. Hozd letre a titkos fajlt:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\store-dpapi-secret.ps1 -Path "$env:APPDATA\Codex\secrets\jira-api-token.dpapi" -Prompt "Jira API token"
```

Ha a secure promptban a beillesztes nem megbizhato, hasznald inkabb a vagolapos modot:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\store-dpapi-secret.ps1 -Path "$env:APPDATA\Codex\secrets\jira-api-token.dpapi" -FromClipboard
```

2. Az `.env` fajlban allitsd be:

```dotenv
JIRA_API_TOKEN_DPAPI_FILE=%APPDATA%\Codex\secrets\jira-api-token.dpapi
```

3. Torold a `JIRA_API_TOKEN=` sort az `.env`-bol.

## Mukodes

- Ha a plain text env es a DPAPI fajl egyszerre van megadva, a DPAPI fajl elvez elsobbseget.
- A Jira token fallbackkent Confluence tokenkent is hasznalhato, ha kulon Confluence secret nincs megadva.
- A DPAPI secretet ugyanaz a Windows user tudja visszafejteni, aki letrehozta.

## Uzemi megjegyzes

- Ha egy token valaha nem vedett modon volt tarolva vagy megosztva, erdemes rotalni, es az uj tokent mar kozvetlenul DPAPI fajlba menteni.
