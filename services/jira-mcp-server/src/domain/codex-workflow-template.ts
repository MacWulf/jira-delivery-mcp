import { randomUUID } from "node:crypto";

import type {
  JiraWorkflowDefinition,
  JiraWorkflowStatusDefinition,
  JiraWorkflowUpdateRequest
} from "../services/jira-api.js";

export type CodexWorkflowTargetStatusName =
  | "To Do"
  | "Selected"
  | "In Progress"
  | "Blocked"
  | "In Review"
  | "QA"
  | "User Testing"
  | "Cancelled"
  | "Done";

const TARGET_STATUS_ORDER: Array<{
  name: CodexWorkflowTargetStatusName;
  description: string;
  statusCategory: "TODO" | "IN_PROGRESS" | "DONE";
  layout: { x: number; y: number };
}> = [
  {
    name: "To Do",
    description: "",
    statusCategory: "TODO",
    layout: { x: 180, y: -16 }
  },
  {
    name: "Selected",
    description: "This work item is refined and ready to be picked up next.",
    statusCategory: "TODO",
    layout: { x: 360, y: -16 }
  },
  {
    name: "In Progress",
    description:
      "This work item is being actively worked on at the moment by the assignee.",
    statusCategory: "IN_PROGRESS",
    layout: { x: 560, y: -16 }
  },
  {
    name: "Blocked",
    description:
      "This work item cannot advance because an explicit blocker is unresolved.",
    statusCategory: "IN_PROGRESS",
    layout: { x: 560, y: 170 }
  },
  {
    name: "In Review",
    description: "",
    statusCategory: "IN_PROGRESS",
    layout: { x: 760, y: -16 }
  },
  {
    name: "QA",
    description:
      "This work item is under assistant-owned or technically verifiable validation against acceptance criteria.",
    statusCategory: "IN_PROGRESS",
    layout: { x: 960, y: -16 }
  },
  {
    name: "User Testing",
    description:
      "This work item is waiting for human-owned business or manual validation after technical QA is complete.",
    statusCategory: "IN_PROGRESS",
    layout: { x: 1160, y: -16 }
  },
  {
    name: "Cancelled",
    description:
      "The work item was intentionally stopped, superseded, or removed from the delivery scope without being completed.",
    statusCategory: "DONE",
    layout: { x: 1360, y: 170 }
  },
  {
    name: "Done",
    description: "",
    statusCategory: "DONE",
    layout: { x: 1560, y: -16 }
  }
];

export function getCodexWorkflowTargetStatuses(): typeof TARGET_STATUS_ORDER {
  return TARGET_STATUS_ORDER;
}

export function buildCodexManagedWorkflowUpdate(input: {
  projectId: string;
  workflow: JiraWorkflowDefinition;
  availableStatuses: JiraWorkflowStatusDefinition[];
}): JiraWorkflowUpdateRequest {
  const statusByName = new Map(
    input.availableStatuses.map((status) => [status.name, status] as const)
  );
  const statusReferenceByName = new Map(
    TARGET_STATUS_ORDER.map((target) => [target.name, randomUUID()] as const)
  );
  const statuses = TARGET_STATUS_ORDER.map((target) => {
    const status = statusByName.get(target.name);

    if (!status?.id) {
      throw new Error(`Missing required project status: ${target.name}`);
    }

    return {
      id: status.id,
      statusReference: requireGeneratedStatusReference(
        statusReferenceByName,
        target.name
      ),
      name: status.name,
      statusCategory: status.statusCategory,
      scope: {
        type: "PROJECT",
        project: {
          id: input.projectId
        }
      },
      description: target.description
    } satisfies JiraWorkflowStatusDefinition;
  });

  return {
    statuses,
    workflows: [
      {
        ...input.workflow,
        description: "Assistant-managed lifecycle for Jira delivery work.",
        statuses: TARGET_STATUS_ORDER.map((target) => ({
          statusReference: requireGeneratedStatusReference(
            statusReferenceByName,
            target.name
          ),
          layout: target.layout,
          properties: {},
          deprecated: false
        })),
        transitions: [
          {
            id: "1",
            type: "INITIAL",
            toStatusReference: requireGeneratedStatusReference(
              statusReferenceByName,
              "To Do"
            ),
            links: [],
            name: "Create",
            description: "",
            actions: [],
            validators: [],
            triggers: [],
            properties: {
              "jira.i18n.title": "common.forms.create"
            }
          },
          {
            id: "5",
            type: "DIRECTED",
            toStatusReference: requireGeneratedStatusReference(
              statusReferenceByName,
              "Selected"
            ),
            links: [
              link("To Do")
            ],
            name: "Select Work",
            description: "Move refined work into the ready-to-start queue.",
            actions: [],
            validators: [],
            triggers: [],
            properties: {}
          },
          {
            id: "2",
            type: "DIRECTED",
            toStatusReference: requireGeneratedStatusReference(
              statusReferenceByName,
              "In Progress"
            ),
            links: [link("To Do"), link("Selected")],
            name: "Start Work",
            description: "",
            actions: [],
            validators: [],
            triggers: [],
            properties: {}
          },
          {
            id: "6",
            type: "DIRECTED",
            toStatusReference: requireGeneratedStatusReference(
              statusReferenceByName,
              "Blocked"
            ),
            links: [
              link("Selected"),
              link("In Progress"),
              link("In Review"),
              link("QA"),
              link("User Testing")
            ],
            name: "Mark Blocked",
            description:
              "Work is currently blocked by an unresolved dependency or decision.",
            actions: [],
            validators: [],
            triggers: [],
            properties: {}
          },
          {
            id: "7",
            type: "DIRECTED",
            toStatusReference: requireGeneratedStatusReference(
              statusReferenceByName,
              "In Progress"
            ),
            links: [link("Blocked")],
            name: "Resume Work",
            description: "The blocker is cleared and implementation can continue.",
            actions: [],
            validators: [],
            triggers: [],
            properties: {}
          },
          {
            id: "3",
            type: "DIRECTED",
            toStatusReference: requireGeneratedStatusReference(
              statusReferenceByName,
              "In Review"
            ),
            links: [link("In Progress")],
            name: "Work Done",
            description: "",
            actions: [],
            validators: [],
            triggers: [],
            properties: {}
          },
          {
            id: "9",
            type: "DIRECTED",
            toStatusReference: requireGeneratedStatusReference(
              statusReferenceByName,
              "In Progress"
            ),
            links: [link("In Review")],
            name: "Request Changes",
            description: "Review found implementation work to be completed.",
            actions: [],
            validators: [],
            triggers: [],
            properties: {}
          },
          {
            id: "8",
            type: "DIRECTED",
            toStatusReference: requireGeneratedStatusReference(
              statusReferenceByName,
              "QA"
            ),
            links: [link("In Review")],
            name: "Send To QA",
            description:
              "Move the work item into assistant-owned or technically verifiable acceptance validation.",
            actions: [],
            validators: [],
            triggers: [],
            properties: {}
          },
          {
            id: "10",
            type: "DIRECTED",
            toStatusReference: requireGeneratedStatusReference(
              statusReferenceByName,
              "In Progress"
            ),
            links: [link("QA")],
            name: "QA Failed",
            description: "Acceptance validation failed and work must continue.",
            actions: [],
            validators: [],
            triggers: [],
            properties: {}
          },
          {
            id: "4",
            type: "DIRECTED",
            toStatusReference: requireGeneratedStatusReference(
              statusReferenceByName,
              "User Testing"
            ),
            links: [link("QA")],
            name: "Send To User Testing",
            description:
              "Hand the work item off for human-owned business or manual validation.",
            actions: [],
            validators: [],
            triggers: [],
            properties: {}
          },
          {
            id: "12",
            type: "DIRECTED",
            toStatusReference: requireGeneratedStatusReference(
              statusReferenceByName,
              "In Progress"
            ),
            links: [link("User Testing")],
            name: "User Testing Failed",
            description:
              "Human validation found remaining issues and implementation must continue.",
            actions: [],
            validators: [],
            triggers: [],
            properties: {}
          },
          {
            id: "13",
            type: "DIRECTED",
            toStatusReference: requireGeneratedStatusReference(
              statusReferenceByName,
              "Done"
            ),
            links: [link("User Testing")],
            name: "Accepted",
            description: "",
            actions: [],
            validators: [],
            triggers: [],
            properties: {}
          },
          {
            id: "14",
            type: "DIRECTED",
            toStatusReference: requireGeneratedStatusReference(
              statusReferenceByName,
              "Cancelled"
            ),
            links: [
              link("To Do"),
              link("Selected"),
              link("In Progress"),
              link("Blocked"),
              link("In Review"),
              link("QA"),
              link("User Testing")
            ],
            name: "Cancel Work",
            description:
              "Stop the work item intentionally without treating it as completed delivery.",
            actions: [],
            validators: [],
            triggers: [],
            properties: {}
          },
          {
            id: "11",
            type: "DIRECTED",
            toStatusReference: requireGeneratedStatusReference(
              statusReferenceByName,
              "To Do"
            ),
            links: [
              link("Selected"),
              link("In Progress"),
              link("Blocked"),
              link("In Review"),
              link("QA"),
              link("User Testing")
            ],
            name: "Return To Do",
            description:
              "Return the item to backlog for re-planning or de-prioritization.",
            actions: [],
            validators: [],
            triggers: [],
            properties: {}
          },
          {
            id: "15",
            type: "DIRECTED",
            toStatusReference: requireGeneratedStatusReference(
              statusReferenceByName,
              "To Do"
            ),
            links: [link("Cancelled")],
            name: "Restore To Do",
            description:
              "Return cancelled work to backlog when the scope becomes active again.",
            actions: [],
            validators: [],
            triggers: [],
            properties: {}
          }
        ],
        loopedTransitionContainerLayout:
          input.workflow.loopedTransitionContainerLayout ?? {}
      }
    ]
  };

  function link(name: CodexWorkflowTargetStatusName) {
    return {
      fromStatusReference: requireGeneratedStatusReference(
        statusReferenceByName,
        name
      ),
      fromPort: 3,
      toPort: 7
    };
  }
}

function requireGeneratedStatusReference(
  statusReferenceByName: Map<CodexWorkflowTargetStatusName, string>,
  statusName: CodexWorkflowTargetStatusName
): string {
  const statusReference = statusReferenceByName.get(statusName);

  if (!statusReference) {
    throw new Error(`Missing status reference for ${statusName}`);
  }

  return statusReference;
}
