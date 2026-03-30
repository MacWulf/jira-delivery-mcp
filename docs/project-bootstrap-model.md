# Project Bootstrap Model

## Purpose

The assistant should not only manage issues; it should also be able to bootstrap a Jira project in a controlled way.

## Two Common Project Modes

### Team-Managed / Simplified

- fast to start
- lower admin overhead
- common choice for smaller autonomous teams
- some classic scheme APIs may return limited or empty data

### Company-Managed / Classic

- centralized workflow governance
- issue type schemes and stronger administrative control
- useful when multiple projects need consistent standards

## Practical Implication

Bootstrap logic must stay tenant-aware:

- some admin discovery endpoints are available everywhere
- project-assigned scheme data can be limited for team-managed projects
- bootstrap planning should adapt to the actual project model instead of assuming one universal admin surface

## Bootstrap Phases

### 1. Discovery

- `list_projects`
- `get_project`
- `get_project_admin_snapshot`
- `list_workflow_schemes`

### 2. Bootstrap Planning

The assistant decides:

- whether to create a new project or seed an existing one
- which project type fits best
- which management model and delivery model are appropriate
- which baseline workflow policy should apply

### 3. Project Creation

- `bootstrap_project_from_template`
- `bootstrap_software_project`

Recommended entry point:

- `bootstrap_software_project`

This hides raw template keys and lets the operator choose a software-oriented delivery model such as `kanban` or `scrum`.

### 4. Backlog Seeding

Planned extensions include:

- epic, story, task, and subtask seeding
- default dependencies
- kickoff, architecture, and delivery starter items
- optional documentation skeletons

## Safety Model

- project bootstrap starts in `dry-run`
- live creation requires `JIRA_EXECUTION_MODE=live` and explicit confirmation
- project creation is treated as a high-impact write operation
