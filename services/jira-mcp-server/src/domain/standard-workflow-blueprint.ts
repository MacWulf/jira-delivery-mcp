export type StandardWorkflowStatusBlueprint = {
  key:
    | "todo"
    | "selected"
    | "inProgress"
  | "blocked"
  | "review"
  | "qa"
  | "userTesting"
  | "cancelled"
  | "done";
  name: string;
  description: string;
  statusCategory: "TODO" | "IN_PROGRESS" | "DONE";
  layout: {
    x: number;
    y: number;
  };
};

export type StandardWorkflowTransitionBlueprint = {
  id: string;
  name: string;
  type: "INITIAL" | "DIRECTED";
  to: StandardWorkflowStatusBlueprint["key"];
  from: StandardWorkflowStatusBlueprint["key"][];
  description?: string;
};

export const STANDARD_TEAM_MANAGED_WORKFLOW_STATUSES: StandardWorkflowStatusBlueprint[] =
  [
    {
      key: "todo",
      name: "To Do",
      description:
        "The work item exists in the backlog but is not yet selected for active delivery.",
      statusCategory: "TODO",
      layout: { x: 120, y: -16 }
    },
    {
      key: "selected",
      name: "Selected",
      description:
        "The work item is refined, dependency-checked, and ready to be picked up next.",
      statusCategory: "TODO",
      layout: { x: 320, y: -16 }
    },
    {
      key: "inProgress",
      name: "In Progress",
      description:
        "Implementation is actively underway and the assignee owns the next change.",
      statusCategory: "IN_PROGRESS",
      layout: { x: 540, y: -16 }
    },
    {
      key: "blocked",
      name: "Blocked",
      description:
        "Active work cannot advance until an explicit blocker is removed. A Blocks link should exist for every blocked item.",
      statusCategory: "IN_PROGRESS",
      layout: { x: 540, y: 150 }
    },
    {
      key: "review",
      name: "In Review",
      description:
        "Implementation is handed off for peer review or product review before validation.",
      statusCategory: "IN_PROGRESS",
      layout: { x: 780, y: -16 }
    },
    {
      key: "qa",
      name: "QA",
      description:
        "The work item is under assistant-owned or technically verifiable validation against its acceptance criteria before human acceptance.",
      statusCategory: "IN_PROGRESS",
      layout: { x: 1020, y: -16 }
    },
    {
      key: "userTesting",
      name: "User Testing",
      description:
        "The work item is waiting for human-owned business or manual validation after technical QA completes.",
      statusCategory: "IN_PROGRESS",
      layout: { x: 1240, y: -16 }
    },
    {
      key: "cancelled",
      name: "Cancelled",
      description:
        "The work item was intentionally stopped, superseded, or removed from scope without being completed.",
      statusCategory: "DONE",
      layout: { x: 1240, y: 150 }
    },
    {
      key: "done",
      name: "Done",
      description:
        "The work item is accepted, validated, and no further delivery work is expected.",
      statusCategory: "DONE",
      layout: { x: 1460, y: -16 }
    }
  ];

export const STANDARD_TEAM_MANAGED_WORKFLOW_TRANSITIONS: StandardWorkflowTransitionBlueprint[] =
  [
    {
      id: "1",
      name: "Create",
      type: "INITIAL",
      to: "todo",
      from: []
    },
    {
      id: "101",
      name: "Select Work",
      type: "DIRECTED",
      to: "selected",
      from: ["todo"]
    },
    {
      id: "111",
      name: "Return to To Do",
      type: "DIRECTED",
      to: "todo",
      from: ["selected"]
    },
    {
      id: "121",
      name: "Start Work",
      type: "DIRECTED",
      to: "inProgress",
      from: ["selected"]
    },
    {
      id: "131",
      name: "Mark Blocked",
      type: "DIRECTED",
      to: "blocked",
      from: ["inProgress", "review", "qa", "userTesting"]
    },
    {
      id: "141",
      name: "Unblock",
      type: "DIRECTED",
      to: "inProgress",
      from: ["blocked"]
    },
    {
      id: "151",
      name: "Work Done",
      type: "DIRECTED",
      to: "review",
      from: ["inProgress"]
    },
    {
      id: "161",
      name: "Changes Requested",
      type: "DIRECTED",
      to: "inProgress",
      from: ["review", "qa", "userTesting"]
    },
    {
      id: "171",
      name: "Send to QA",
      type: "DIRECTED",
      to: "qa",
      from: ["review"]
    },
    {
      id: "181",
      name: "Send to User Testing",
      type: "DIRECTED",
      to: "userTesting",
      from: ["qa"]
    },
    {
      id: "191",
      name: "User Testing Failed",
      type: "DIRECTED",
      to: "inProgress",
      from: ["userTesting"]
    },
    {
      id: "201",
      name: "Accepted",
      type: "DIRECTED",
      to: "done",
      from: ["userTesting"]
    },
    {
      id: "206",
      name: "Cancel Work",
      type: "DIRECTED",
      to: "cancelled",
      from: ["todo", "selected", "inProgress", "blocked", "review", "qa", "userTesting"]
    },
    {
      id: "208",
      name: "Restore To Do",
      type: "DIRECTED",
      to: "todo",
      from: ["cancelled"]
    },
    {
      id: "211",
      name: "Reopen",
      type: "DIRECTED",
      to: "todo",
      from: ["done"]
    }
  ];
