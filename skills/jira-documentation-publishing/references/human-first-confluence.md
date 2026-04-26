# Human-First Confluence Standard

Use this reference when the assistant is publishing or reorganizing project documentation for human readers.

## The Goal

The Confluence space should not feel like a raw export of repository files.

It should help a human operator quickly answer:

- what this project is
- where to start reading
- which page explains which part of the system
- what each skill or service really does
- what is live, reviewed, provisional, or still manual

## Minimum Quality Bar

For any meaningful project documentation set, prefer this structure:

1. A real landing page
   This should act like a front door, not a file dump.
2. One or more orientation pages
   For example architecture overview, skills overview, or operator guidance.
3. Dedicated deep-reference pages
   Use these for important subsystems such as the MCP server, each skill, workflow policy, or quality model.

## Space Architecture Rules

- A professional space should expose purpose, scope, and how to start reading.
- A project with multiple capabilities should not stop at one index plus many flat children.
- Important page families should be visible:
  - overview
  - architecture
  - policy
  - reference
  - status update
  - onboarding or operator guidance
  - archive or deprecated content when relevant
- Parent-child placement should be intentional, not an accident of creation order.

## Information Architecture Rules

- Keep landing pages and deep-reference pages separate.
- Group related children under meaningful parent pages whenever the hierarchy supports it.
- Prefer a navigation model based on reader intent:
  - new to the project
  - trying to operate the system
  - trying to change workflow or admin policy
  - trying to understand quality or documentation behavior
- Avoid mixing historical implementation leftovers with current primary documentation.
- Do not let obsolete or one-off implementation pages stay in the main navigation path without an explicit deprecated or archival signal.

## Page Design Rules

Every durable page should make these things obvious:

- what the page is for
- who owns it
- what lifecycle state it is in
- who should read it
- what the system does in reality
- what the system does not do
- what other pages are related
- where the source evidence comes from

Prefer sections like:

- Summary
- Document status
- Owner and review cadence
- When to use or When to read
- What it does in practice
- Guardrails or Limits
- Related pages
- Sources

## Writing Style Rules

- Optimize for human scanning, not only technical completeness.
- Use short sections with clear headings.
- Prefer plain language before implementation detail.
- Explain behavior in real-world terms, not only in tool or file names.
- Avoid titles that sound like generated placeholders when a clearer name is available.

## Trust Signals

Professional documentation should show that it is maintained:

- meaningful status instead of vague placeholders
- clear ownership or review responsibility when possible
- last reviewed or as-of date where it matters
- next review expectation for long-lived pages
- coherent page naming
- consistent taxonomy and labels
- no broken or obviously wrong link text
- visible distinction between automated, planned, and manual-only behavior

## Practical Publishing Rule

If the initial tool-generated page is structurally correct but still feels skeletal or machine-generated, do not stop there.

Follow up by:

- improving the title if needed
- enriching the body
- adding role-based navigation
- splitting overcrowded pages
- creating dedicated pages for major concepts such as each skill or the MCP server

## Metadata Standard

For durable project pages, prefer visible metadata such as:

- owner
- reviewer when relevant
- document status
- last reviewed or as-of date
- next review date for reference/policy pages
- source of truth
- linked Jira scope when relevant
- sensitivity or access classification when governance matters

If this metadata cannot be enforced technically, it should still be made visible in the page body.

## Lifecycle Standard

Do not conflate document lifecycle with Jira issue lifecycle.

For documentation, prefer states like:

- draft
- in review
- active
- deprecated
- archived

This helps human readers trust what they are looking at.
