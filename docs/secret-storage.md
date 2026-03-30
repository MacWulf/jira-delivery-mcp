# Secret Storage

## Goal

API tokens should not live in plain text inside a local `.env` file unless there is no better option.

## Supported Modes

### Plain Environment Variables

- `JIRA_API_TOKEN`
- `CONFLUENCE_API_TOKEN`

This remains supported for compatibility, but it is not the preferred local setup when stronger platform-native options are available.

### Windows DPAPI-Protected Files

- `JIRA_API_TOKEN_DPAPI_FILE`
- `CONFLUENCE_API_TOKEN_DPAPI_FILE`

In this mode the token is stored in a DPAPI-protected file bound to the current Windows user.

## Recommended Local Setup on Windows

1. Create a protected secret file:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\store-dpapi-secret.ps1 -Path "$env:APPDATA\JiraDeliveryMcp\secrets\jira-api-token.dpapi" -Prompt "Jira API token"
```

If secure-prompt paste behavior is unreliable, use the clipboard mode instead:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\store-dpapi-secret.ps1 -Path "$env:APPDATA\JiraDeliveryMcp\secrets\jira-api-token.dpapi" -FromClipboard
```

2. Configure `.env`:

```dotenv
JIRA_API_TOKEN_DPAPI_FILE=%APPDATA%\JiraDeliveryMcp\secrets\jira-api-token.dpapi
```

3. Remove `JIRA_API_TOKEN=` from `.env` if it is present.

## Behavior

- If both a plain environment variable and a DPAPI file are configured, the DPAPI file takes precedence.
- The Jira token can serve as a fallback Confluence token when no separate Confluence secret is configured.
- The DPAPI secret can only be decrypted by the same Windows user who created it.

## Operational Note

If a token was ever stored or shared without protection, rotate it and re-store the replacement in a protected secret file.
