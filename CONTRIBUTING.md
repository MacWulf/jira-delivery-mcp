# Contributing

Thanks for considering a contribution to `jira-delivery-mcp`.

## Before You Start

- read the [README](./README.md)
- review the main docs under [`docs/`](./docs)
- keep changes modular and easy to reason about
- prefer small, reviewable pull requests over large mixed-purpose changes

## Development Setup

1. Clone the repository.
2. Copy `.env.example` to `.env`.
3. Configure Jira credentials and any optional Confluence settings.
4. Install dependencies:

```powershell
npm install
```

5. Validate the workspace:

```powershell
npm run check
npm run build
npm run smoke
```

## Project Principles

- Keep responsibilities separated by service, policy, and tool boundary.
- Prefer explicit policy modules over hidden behavior.
- Keep public documentation concise and durable.
- Treat live Jira writes as high-signal operations that should remain auditable.
- When a Jira action cannot be completed safely through the available tooling, prefer a clear manual fallback over unsafe automation.

## Skills

The repository includes an optional Codex skill package under [`skills/`](./skills).

If you change a skill:

- keep the instructions English and tenant-aware
- avoid hardcoded tenant assumptions
- validate the skill with the local `skill-creator` validator when available

## Pull Requests

Please keep pull requests focused. A good pull request usually contains one of:

- one feature
- one refactor
- one documentation cleanup
- one policy or workflow improvement

Include:

- what changed
- why it changed
- how you validated it
- any remaining limitations or manual follow-ups

## Sensitive Data

Do not commit:

- real Jira or Confluence tokens
- tenant-specific internal data
- personal machine paths unless they are clearly placeholder examples
- validation artifacts or generated build output
