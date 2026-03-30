# Project Brief: Internal Support Console

## Basics

- Project name: Internal Support Console
- Project key: SUPPORTUI
- Project type: `software`
- Management model: `team-managed`
- Delivery mode: `kanban`

## Goal

Build a lightweight internal support console that helps operators manage customer requests, reference data, and manual verification steps.

## Target Users

- internal support specialists
- operations team members
- product owner

## First Release

The first usable slice should allow a support specialist to:

- sign in
- browse open requests
- open a request detail view
- leave an internal comment on a request

## Out of Scope for the First Release

- full role and permission management
- automated SLA engine
- multi-system synchronization
- reporting dashboards

## Constraints

- keep the initial backlog small because the team is small
- prefer a fast-start project model for the initial setup
- run the work in a Kanban-style delivery flow

## Initial Jira Structure

### Epic

- Support console foundation

### Starter Stories

- Sign-in and session handling
- Open requests list
- Request detail view
- Internal request comments

### Starter Tasks

- Repository and project bootstrap
- UI shell setup
- Base API integration
- Sample request dataset

## Acceptance Approach

- the first slice should work end to end
- the backlog should stay compact, readable, and startable
- every story should have clear acceptance criteria
- dependencies should be linked explicitly
