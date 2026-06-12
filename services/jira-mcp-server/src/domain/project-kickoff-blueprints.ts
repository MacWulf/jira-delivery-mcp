import type { IssueExecutionMetadataInput } from "./issue-execution-metadata.js";

export type KickoffItemType = "Epic" | "Story" | "Task";

export type KickoffItemBlueprint = {
  id: string;
  issueType: KickoffItemType;
  summary: string;
  description: string;
  executionMetadata?: IssueExecutionMetadataInput;
  parentId?: string;
  labels?: string[];
  marksDone?: boolean;
  startWork?: boolean;
};

export type KickoffDependencyBlueprint = {
  blocks: string;
  blockedBy: string;
};

export type KickoffTemplate = {
  key: "codex-jira-assistant-mvp";
  name: string;
  labels: string[];
  items: KickoffItemBlueprint[];
  dependencies: KickoffDependencyBlueprint[];
};

export function buildCodexJiraAssistantKickoffTemplate(): KickoffTemplate {
  return {
    key: "codex-jira-assistant-mvp",
    name: "Codex Jira Assistant MVP",
    labels: ["codex-managed", "jira-delivery-mcp", "product-backlog"],
    items: [
      {
        id: "epic-bootstrap",
        issueType: "Epic",
        labels: ["epic"],
        summary: "Project bootstrap and kickoff automation",
        description: [
          "Goal: future assistant-led projects should start through a controlled Jira bootstrap flow.",
          "",
          "Expected outcome:",
          "- bootstrap input contract",
          "- project creation and template selection",
          "- kickoff checklist and initial artifact seeding"
        ].join("\n")
      },
      {
        id: "story-brief-schema",
        issueType: "Story",
        parentId: "epic-bootstrap",
        labels: ["story"],
        startWork: true,
        summary: "Define the bootstrap input contract and project brief schema",
        description: [
          "From a product-owner perspective, project kickoff is only safe to automate when the brief is structured and verifiable.",
          "",
          "Acceptance criteria:",
          "- the kickoff brief has formally defined required and optional fields",
          "- the schema covers goal, scope, delivery model, ownership, and definition of done",
          "- invalid input returns clear errors"
        ].join("\n"),
        executionMetadata: {
          requiredSkills: ["jira-core", "jira-project-bootstrap"],
          optionalSkills: ["jira-intake-refinement", "jira-architect"],
          executionMode: "implement"
        }
      },
      {
        id: "story-project-create",
        issueType: "Story",
        parentId: "epic-bootstrap",
        labels: ["story"],
        summary: "Finalize project creation and template-selection flow",
        description: [
          "Project bootstrap should make an intentional decision about project type and template selection.",
          "",
          "Acceptance criteria:",
          "- the kickoff brief drives the software, business, or service-desk choice",
          "- the management model and delivery model selection are documented",
          "- bootstrap output is auditable"
        ].join("\n"),
        executionMetadata: {
          requiredSkills: ["jira-core", "jira-project-bootstrap", "jira-architect"],
          optionalSkills: ["jira-workflow-admin"],
          executionMode: "implement"
        }
      },
      {
        id: "story-kickoff-artifacts",
        issueType: "Story",
        parentId: "epic-bootstrap",
        labels: ["story"],
        summary: "Seed kickoff checklist and initial project artifacts",
        description: [
          "Kickoff should create not only the project shell, but also the minimum operational artifacts needed to start safely.",
          "",
          "Acceptance criteria:",
          "- kickoff checklist items are created",
          "- ownership and default operating elements are recorded",
          "- the initial seed does not skip critical setup steps"
        ].join("\n"),
        executionMetadata: {
          requiredSkills: ["jira-core", "jira-project-bootstrap", "jira-architect"],
          executionMode: "implement"
        }
      },
      {
        id: "epic-backlog",
        issueType: "Epic",
        labels: ["epic"],
        summary: "Backlog generation and dependency modeling",
        description: [
          "Goal: turn the project brief into a workable delivery backlog, not a flat list of disconnected issues.",
          "",
          "Expected outcome:",
          "- epic, story, and task generation",
          "- explicit dependency graph",
          "- idempotent re-run behavior"
        ].join("\n")
      },
      {
        id: "story-backlog-generate",
        issueType: "Story",
        parentId: "epic-backlog",
        labels: ["story"],
        summary: "Generate epics, stories, and tasks from the brief",
        description: [
          "The brief should become a usable backlog so the project can start delivery immediately after kickoff.",
          "",
          "Acceptance criteria:",
          "- the brief produces epics, stories, and tasks",
          "- issue descriptions include intent and execution context",
          "- the backlog respects the expected product-owner slicing"
        ].join("\n"),
        executionMetadata: {
          requiredSkills: [
            "jira-core",
            "jira-project-bootstrap",
            "jira-intake-refinement"
          ],
          executionMode: "implement"
        }
      },
      {
        id: "story-dependency-graph",
        issueType: "Story",
        parentId: "epic-backlog",
        labels: ["story"],
        summary: "Introduce dependency graph and `Blocks` link handling",
        description: [
          "Delivery sequencing needs an explicit dependency model; otherwise the assistant may start work in the wrong order.",
          "",
          "Acceptance criteria:",
          "- blocking logic is based on Jira `Blocks` links",
          "- the system can distinguish startable work from blocked work",
          "- dependency regeneration does not create chaos"
        ].join("\n"),
        executionMetadata: {
          requiredSkills: ["jira-core", "jira-project-bootstrap"],
          optionalSkills: ["jira-execution-loop"],
          executionMode: "implement"
        }
      },
      {
        id: "story-idempotent-rerun",
        issueType: "Story",
        parentId: "epic-backlog",
        labels: ["story"],
        summary: "Support idempotent reruns and duplicate protection",
        description: [
          "Kickoff and backlog seeding are only operationally safe if they can be rerun without duplicating work.",
          "",
          "Acceptance criteria:",
          "- rerunning the same seed does not recreate everything",
          "- duplicate issues and dependencies can be detected",
          "- seed output ends with a transparent report"
        ].join("\n"),
        executionMetadata: {
          requiredSkills: ["jira-core", "jira-project-bootstrap"],
          executionMode: "implement"
        }
      },
      {
        id: "epic-execution",
        issueType: "Epic",
        labels: ["epic"],
        summary: "Execution orchestrator and issue lifecycle",
        description: [
          "Goal: after backlog seeding, the assistant should be able to drive work forward in Jira.",
          "",
          "Expected outcome:",
          "- next-issue selection",
          "- status and comment orchestration",
          "- readiness-based handoff and completion"
        ].join("\n")
      },
      {
        id: "story-next-issue",
        issueType: "Story",
        parentId: "epic-execution",
        labels: ["story"],
        summary: "Select the next unblocked issue",
        description: [
          "The assistant should pull the correct next issue from the backlog.",
          "",
          "Acceptance criteria:",
          "- completed and blocked issues are excluded from selection",
          "- prioritization rules are configurable",
          "- the selection rationale can be returned to the operator"
        ].join("\n"),
        executionMetadata: {
          requiredSkills: ["jira-core", "jira-execution-loop"],
          executionMode: "implement"
        }
      },
      {
        id: "story-work-lifecycle",
        issueType: "Story",
        parentId: "epic-execution",
        labels: ["story"],
        summary: "Orchestrate start, comments, worklog, and status transitions",
        description: [
          "The real delivery loop needs to manage issue state as well as supporting execution signals.",
          "",
          "Acceptance criteria:",
          "- the system can start work using the correct transition",
          "- comments and worklogs can be recorded automatically when appropriate",
          "- lifecycle transitions respect project policy"
        ].join("\n"),
        executionMetadata: {
          requiredSkills: ["jira-core", "jira-execution-loop"],
          optionalSkills: ["jira-workflow-admin"],
          executionMode: "implement"
        }
      },
      {
        id: "story-readiness",
        issueType: "Story",
        parentId: "epic-execution",
        labels: ["story"],
        summary: "Readiness-based handoff and completion logic",
        description: [
          "The assistant should not set `Done` mechanically.",
          "",
          "Acceptance criteria:",
          "- review, test, and documentation checklists are supported",
          "- a readiness check runs before the done transition",
          "- handoff and close behavior are auditable"
        ].join("\n"),
        executionMetadata: {
          requiredSkills: [
            "jira-core",
            "jira-execution-loop",
            "jira-intake-refinement"
          ],
          executionMode: "implement"
        }
      },
      {
        id: "epic-governance",
        issueType: "Epic",
        labels: ["epic"],
        summary: "Governance, workflow policy, and documentation",
        description: [
          "Goal: the system should not only work, but also stay operable across future Codex-assisted projects.",
          "",
          "Expected outcome:",
          "- workflow policy map",
          "- approval and audit gate",
          "- kickoff documentation"
        ].join("\n")
      },
      {
        id: "story-workflow-policy",
        issueType: "Story",
        parentId: "epic-governance",
        labels: ["story"],
        summary: "Project-specific workflow and status policy layer",
        description: [
          "The system should learn the project workflow instead of depending on hardcoded lifecycle assumptions.",
          "",
          "Acceptance criteria:",
          "- workflow and transition policy are modeled at project scope",
          "- different Jira project models can be handled cleanly",
          "- the delivery loop uses only valid transitions"
        ].join("\n"),
        executionMetadata: {
          requiredSkills: ["jira-core", "jira-workflow-admin"],
          optionalSkills: ["jira-execution-loop"],
          executionMode: "admin"
        }
      },
      {
        id: "story-audit-approval",
        issueType: "Story",
        parentId: "epic-governance",
        labels: ["story"],
        summary: "Approval gates and audit trail for critical operations",
        description: [
          "High-impact operations need controlled execution.",
          "",
          "Acceptance criteria:",
          "- critical writes and workflow changes produce an audit trail",
          "- risky operations can be placed behind an approval gate",
          "- logs remain reviewable afterward"
        ].join("\n"),
        executionMetadata: {
          requiredSkills: ["jira-core"],
          optionalSkills: ["jira-workflow-admin"],
          executionMode: "implement"
        }
      },
      {
        id: "story-docs-confluence",
        issueType: "Story",
        parentId: "epic-governance",
        labels: ["story"],
        summary: "Kickoff documentation and optional Confluence synchronization",
        description: [
          "The outcome of project kickoff should be documented in a human-readable way.",
          "",
          "Acceptance criteria:",
          "- kickoff documentation can be generated",
          "- the role split between repository and Confluence is clear",
          "- the result of kickoff is understandable later"
        ].join("\n"),
        executionMetadata: {
          requiredSkills: ["jira-core"],
          optionalSkills: ["jira-project-bootstrap", "jira-architect"],
          executionMode: "implement"
        }
      }
    ],
    dependencies: [
      { blocks: "story-brief-schema", blockedBy: "story-project-create" },
      { blocks: "story-brief-schema", blockedBy: "story-kickoff-artifacts" },
      { blocks: "story-brief-schema", blockedBy: "story-backlog-generate" },
      { blocks: "story-brief-schema", blockedBy: "story-docs-confluence" },
      { blocks: "story-project-create", blockedBy: "story-backlog-generate" },
      { blocks: "story-backlog-generate", blockedBy: "story-dependency-graph" },
      { blocks: "story-backlog-generate", blockedBy: "story-idempotent-rerun" },
      { blocks: "story-workflow-policy", blockedBy: "story-next-issue" },
      { blocks: "story-workflow-policy", blockedBy: "story-work-lifecycle" },
      { blocks: "story-work-lifecycle", blockedBy: "story-audit-approval" },
      { blocks: "story-workflow-policy", blockedBy: "story-audit-approval" }
    ]
  };
}
