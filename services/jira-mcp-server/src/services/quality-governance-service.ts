import type { AdminCapabilityService } from "./admin-capability-service.js";

export type BugTriageOutcome =
  | "repro-ready"
  | "need-info"
  | "duplicate"
  | "rejected"
  | "non-repro";

export type BugTriagePlan = {
  outcome: BugTriageOutcome;
  requiredFieldsMissing: string[];
  labels: string[];
  notes: string[];
  recommendedActions: string[];
  manualStepRequired: boolean;
};

export type QualityQueueRecommendation = {
  key: "triage-inbox" | "need-info" | "reopened" | "retest";
  purpose: string;
  suggestedJql: string;
  implementationMode: "workflow" | "filter" | "labels";
  notes: string[];
};

export type QualityAutomationRecommendation = {
  name: string;
  trigger: string;
  action: string;
  manualStepRequired: boolean;
  notes: string[];
};

export class QualityGovernanceService {
  constructor(
    private readonly adminCapabilityService: AdminCapabilityService
  ) {}

  planBugTriage(input: {
    summary: string;
    actualBehavior?: string;
    expectedBehavior?: string;
    reproductionSteps?: string[];
    environment?: string;
    evidence?: string[];
    duplicateOfIssueKey?: string;
    nonReproducible?: boolean;
    rejectedReason?: string;
  }): BugTriagePlan {
    if (input.duplicateOfIssueKey) {
      return {
        outcome: "duplicate",
        requiredFieldsMissing: [],
        labels: ["duplicate"],
        notes: [
          `This report should link to ${input.duplicateOfIssueKey} as the canonical bug.`
        ],
        recommendedActions: [
          "Link the report to the canonical bug.",
          "Leave a short trace explaining the duplicate decision."
        ],
        manualStepRequired: false
      };
    }

    if (input.rejectedReason) {
      return {
        outcome: "rejected",
        requiredFieldsMissing: [],
        labels: ["rejected"],
        notes: [input.rejectedReason],
        recommendedActions: [
          "Record why the report is not valid bug work for this project."
        ],
        manualStepRequired: false
      };
    }

    if (input.nonReproducible) {
      return {
        outcome: "non-repro",
        requiredFieldsMissing: [],
        labels: ["non-repro"],
        notes: [
          "The report could not be reproduced yet, so it should stay auditable and reopenable."
        ],
        recommendedActions: [
          "Keep the issue visible in Jira instead of treating it as fixed.",
          "Request additional reproduction context or evidence."
        ],
        manualStepRequired: false
      };
    }

    const requiredFieldsMissing = [
      !input.actualBehavior ? "actualBehavior" : undefined,
      !input.expectedBehavior ? "expectedBehavior" : undefined,
      !input.reproductionSteps?.length ? "reproductionSteps" : undefined
    ].filter(Boolean) as string[];

    if (requiredFieldsMissing.length > 0) {
      return {
        outcome: "need-info",
        requiredFieldsMissing,
        labels: ["need-info"],
        notes: [
          "The bug lacks enough context to be worked safely.",
          ...(input.environment ? [] : ["Environment details are still missing."]),
          ...(input.evidence?.length ? [] : ["No evidence was attached yet."])
        ],
        recommendedActions: [
          "Collect the missing bug context before moving the issue into the normal active queue.",
          "Keep the issue visible with an explicit need-info marker."
        ],
        manualStepRequired: false
      };
    }

    return {
      outcome: "repro-ready",
      requiredFieldsMissing: [],
      labels: [],
      notes: [
        "The report has the minimum context needed for implementation work."
      ],
      recommendedActions: [
        "Move the issue into the normal delivery loop.",
        "Preserve the structured evidence block on the issue."
      ],
      manualStepRequired: false
    };
  }

  async planQualityQueues(projectKey: string): Promise<{
    projectKey: string;
    queues: QualityQueueRecommendation[];
    automationRecommendations: QualityAutomationRecommendation[];
    notes: string[];
  }> {
    const discovery = await this.adminCapabilityService.discoverIssueTypeCapabilities(
      projectKey
    );
    const bugCapability = discovery.commonIssueTypes.Bug;
    const validationCapability = discovery.commonIssueTypes.Validation;
    const bugReference = bugCapability?.available
      ? "issuetype = Bug"
      : "labels in (bug)";
    const validationReference = validationCapability?.available
      ? 'issuetype in ("Validation", "Test")'
      : 'labels in ("quality-validation", "quality-test", "retest")';

    return {
      projectKey,
      queues: [
        {
          key: "triage-inbox",
          purpose: "New bug reports that still need triage.",
          suggestedJql: `project = ${projectKey} AND statusCategory != Done AND (${bugReference}) AND (statusCategory = "To Do" OR labels in (triage, need-info))`,
          implementationMode: "filter",
          notes: [
            "Prefer a dedicated triage status only when the tenant already supports it cleanly.",
            "Otherwise use a saved filter or board view."
          ]
        },
        {
          key: "need-info",
          purpose: "Bug reports waiting on missing context.",
          suggestedJql: `project = ${projectKey} AND statusCategory != Done AND (${bugReference}) AND labels in (need-info, non-repro)`,
          implementationMode: "labels",
          notes: [
            "Use labels when the tenant does not expose a dedicated need-info state."
          ]
        },
        {
          key: "reopened",
          purpose: "Bugs or delivery items that returned from quality verification.",
          suggestedJql: `project = ${projectKey} AND statusCategory != Done AND labels in (reopened, qa-failed)`,
          implementationMode: "labels",
          notes: [
            "If the workflow already exposes a reopened-like state, that is preferable to label-only governance."
          ]
        },
        {
          key: "retest",
          purpose: "Validation work that should be rerun after a fix.",
          suggestedJql: `project = ${projectKey} AND statusCategory != Done AND (${validationReference})`,
          implementationMode: "filter",
          notes: [
            "This queue should stay separate from the normal implementation queue."
          ]
        }
      ],
      automationRecommendations: [
        {
          name: "Mark need-info bugs",
          trigger: "Bug is created or updated without minimum repro context.",
          action: "Add the need-info label or move the issue into the tenant's equivalent triage state.",
          manualStepRequired: true,
          notes: [
            "Treat this as a Jira automation recommendation, not a mandatory core tool behavior."
          ]
        },
        {
          name: "Mark reopened quality work",
          trigger: "Validation fails after a prior fix or closure.",
          action: "Add reopened or qa-failed markers and move the affected issue back into an active or ready state through a real Jira transition.",
          manualStepRequired: true,
          notes: [
            "If no safe transition exists, surface the manual Jira step explicitly."
          ]
        },
        {
          name: "Escalate stale need-info",
          trigger: "Need-info bug has not changed for a defined time window.",
          action: "Remind the owner or add a visible stale marker.",
          manualStepRequired: true,
          notes: [
            "Keep time-based nudges in tenant automation, not hidden assistant state."
          ]
        }
      ],
      notes: [
        `Project ${projectKey} is treated as ${discovery.managementModel}. Queue recommendations should adapt to that tenant model.`,
        "Use the smallest viable mechanism: workflow state if it already exists, otherwise filters and labels."
      ]
    };
  }
}
