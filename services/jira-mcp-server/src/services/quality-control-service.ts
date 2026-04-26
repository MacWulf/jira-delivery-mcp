import { adfToPlainText } from "../domain/adf.js";
import {
  buildBugEvidenceDescription,
  buildValidationWorkDescription,
  extractAcceptanceCriteriaForValidation
} from "../domain/quality-control.js";
import { buildIssueDescriptionWithExecutionMetadata } from "../domain/issue-execution-metadata.js";
import { inferWorkflowSemantic } from "../policy/workflow-semantics.js";
import type { JiraApi } from "./jira-api.js";
import { AdminCapabilityService } from "./admin-capability-service.js";

type IssueWithFields = {
  key?: string;
  fields?: {
    summary?: string;
    description?: unknown;
    issuetype?: {
      id?: string;
      name?: string;
      hierarchyLevel?: number;
    };
    project?: {
      id?: string;
      key?: string;
      name?: string;
    };
    status?: {
      name?: string;
      statusCategory?: {
        key?: string;
      };
    };
    labels?: string[];
    parent?: {
      key?: string;
    };
  };
};

export type ValidationWorkPlan = {
  sourceIssueKey: string;
  sourceSummary?: string;
  projectKey: string;
  issueTypeStrategy: {
    preferredTypeNames: string[];
    selectedIssueType: string;
    fallbackUsed: boolean;
    labels: string[];
    notes: string[];
  };
  acceptanceCriteria: string[];
  createPayload: {
    projectKey: string;
    issueType: string;
    summary: string;
    description: string;
    labels: string[];
  };
  linkPlan: {
    typeName: string;
    inwardIssueKey: string;
    outwardIssueKey: string;
  };
};

export type BugCreationPlan = {
  parentIssueKey: string;
  affectedIssueKeys: string[];
  validationIssueKey?: string;
  projectKey: string;
  issueTypeStrategy: {
    preferredTypeNames: string[];
    selectedIssueType: string;
    fallbackUsed: boolean;
    labels: string[];
    notes: string[];
  };
  createPayload: {
    projectKey: string;
    issueType: string;
    summary: string;
    description: string;
    labels: string[];
  };
  linkPlans: Array<{
    typeName: string;
    inwardIssueKey: string;
    outwardIssueKey: string;
  }>;
  parentStatusCorrection?: {
    currentSemantic: string;
    targetSemantic: "in_progress" | "ready" | "todo";
    transitionId?: string;
    transitionName?: string;
    manualStepRequired: boolean;
    notes: string[];
  };
};

export type RetestLoopPlan = {
  parentIssueKey: string;
  bugIssueKey: string;
  validationIssueKey?: string;
  nextAction:
    | "continue-bug-fix"
    | "retest-existing-validation"
    | "generate-validation-work"
    | "re-evaluate-parent-readiness";
  notes: string[];
  projectKey: string;
  statuses: {
    parent?: string;
    bug?: string;
    validation?: string;
  };
};

export class QualityControlService {
  constructor(
    private readonly jiraApi: JiraApi,
    private readonly adminCapabilityService: AdminCapabilityService
  ) {}

  async planValidationWork(issueKey: string): Promise<ValidationWorkPlan> {
    const issue = await this.loadIssue(issueKey);
    const projectKey = issue.fields?.project?.key;

    if (!projectKey) {
      throw new Error(`Could not resolve project for ${issueKey}.`);
    }

    const sourceSummary = issue.fields?.summary;
    const descriptionText = adfToPlainText(issue.fields?.description);
    const acceptanceCriteria = extractAcceptanceCriteriaForValidation(
      descriptionText
    );

    if (acceptanceCriteria.length === 0) {
      throw new Error(
        `${issueKey} does not expose acceptance criteria that can be turned into validation work.`
      );
    }

    const issueTypeStrategy = await this.resolveIssueTypeStrategy({
      projectKey,
      requestedTypeNames: ["Validation", "Test", "Test Case", "Test Plan"],
      fallbackType: "Task",
      fallbackLabels: ["quality", "quality-validation", "quality-test", "pre-dev-test-plan"]
    });
    const validationLabels = Array.from(
      new Set([
        "quality",
        "quality-validation",
        "quality-test",
        "pre-dev-test-plan",
        ...issueTypeStrategy.labels
      ])
    );
    const description = buildIssueDescriptionWithExecutionMetadata(
      buildValidationWorkDescription({
        sourceIssueKey: issueKey,
        ...(sourceSummary ? { sourceSummary } : {}),
        acceptanceCriteria
      }),
      {
        requiredSkills: ["jira-core", "jira-quality-control"],
        optionalSkills: ["jira-execution-loop", "jira-workflow-admin"],
        executionMode: "implement"
      }
    );

    if (!description) {
      throw new Error(`Could not build validation description for ${issueKey}.`);
    }

    const linkType = await this.selectLinkType(["Relates", "Blocks"]);

    return {
      sourceIssueKey: issueKey,
      ...(sourceSummary ? { sourceSummary } : {}),
      projectKey,
      issueTypeStrategy,
      acceptanceCriteria,
      createPayload: {
        projectKey,
        issueType: issueTypeStrategy.selectedIssueType,
        summary: `[Test Plan] ${issueKey} ${sourceSummary ?? ""}`.trim(),
        description,
        labels: validationLabels
      },
      linkPlan: {
        typeName: linkType.name,
        inwardIssueKey: issueKey,
        outwardIssueKey: "__CREATED_ISSUE__"
      }
    };
  }

  async createValidationWork(issueKey: string): Promise<
    ValidationWorkPlan & {
      createdIssue: {
        key: string;
        id: string;
      };
      linkedWith: string;
    }
  > {
    const plan = await this.planValidationWork(issueKey);
    const createdIssue = await this.jiraApi.createIssue(plan.createPayload);

    await this.jiraApi.linkIssues({
      typeName: plan.linkPlan.typeName,
      inwardIssueKey: issueKey,
      outwardIssueKey: createdIssue.key,
      comment: "Linked by the Jira quality-control flow."
    });

    return {
      ...plan,
      createdIssue: {
        key: createdIssue.key,
        id: createdIssue.id
      },
      linkedWith: plan.linkPlan.typeName
    };
  }

  async planBugFromValidationFailure(input: {
    parentIssueKey: string;
    affectedIssueKeys?: string[];
    validationIssueKey?: string;
    summary: string;
    actualBehavior: string;
    expectedBehavior: string;
    reproductionSteps: string[];
    environment?: string;
    evidence?: string[];
  }): Promise<BugCreationPlan> {
    const parentIssue = await this.loadIssue(input.parentIssueKey);
    const projectKey = parentIssue.fields?.project?.key;

    if (!projectKey) {
      throw new Error(`Could not resolve project for ${input.parentIssueKey}.`);
    }

    const issueTypeStrategy = await this.resolveIssueTypeStrategy({
      projectKey,
      requestedTypeNames: ["Bug"],
      fallbackType: "Task",
      fallbackLabels: ["bug", "quality"]
    });
    const affectedIssueKeys = Array.from(
      new Set([input.parentIssueKey, ...(input.affectedIssueKeys ?? [])])
    );
    const description = buildIssueDescriptionWithExecutionMetadata(
      buildBugEvidenceDescription({
        parentIssueKey: input.parentIssueKey,
        affectedIssueKeys,
        ...(input.validationIssueKey
          ? { validationIssueKey: input.validationIssueKey }
          : {}),
        ...(input.environment ? { environment: input.environment } : {}),
        actualBehavior: input.actualBehavior,
        expectedBehavior: input.expectedBehavior,
        reproductionSteps: input.reproductionSteps,
        ...(input.evidence ? { evidence: input.evidence } : {})
      }),
      {
        requiredSkills: ["jira-core", "jira-quality-control"],
        optionalSkills: ["jira-execution-loop", "jira-intake-refinement"],
        executionMode: "implement"
      }
    );

    if (!description) {
      throw new Error(
        `Could not build bug evidence description for ${input.parentIssueKey}.`
      );
    }

    const parentLinkType = await this.selectLinkType(["Blocks", "Relates"]);
    const affectedLinkType = await this.selectLinkType(["Relates", "Blocks"]);
    const validationLinkType = await this.selectLinkType(["Relates", "Blocks"]);
    const parentStatusCorrection = await this.planParentStatusCorrection(
      input.parentIssueKey,
      parentIssue
    );

    return {
      parentIssueKey: input.parentIssueKey,
      affectedIssueKeys,
      ...(input.validationIssueKey
        ? { validationIssueKey: input.validationIssueKey }
        : {}),
      projectKey,
      issueTypeStrategy,
      createPayload: {
        projectKey,
        issueType: issueTypeStrategy.selectedIssueType,
        summary: input.summary,
        description,
        labels: issueTypeStrategy.labels
      },
      linkPlans: [
        {
          typeName: parentLinkType.name,
          inwardIssueKey: input.parentIssueKey,
          outwardIssueKey: "__CREATED_ISSUE__"
        },
        ...affectedIssueKeys
          .filter((issueKey) => issueKey !== input.parentIssueKey)
          .map((issueKey) => ({
            typeName: affectedLinkType.name,
            inwardIssueKey: issueKey,
            outwardIssueKey: "__CREATED_ISSUE__"
          })),
        ...(input.validationIssueKey
          ? [
              {
                typeName: validationLinkType.name,
                inwardIssueKey: "__CREATED_ISSUE__",
                outwardIssueKey: input.validationIssueKey
              }
            ]
          : [])
      ],
      ...(parentStatusCorrection ? { parentStatusCorrection } : {})
    };
  }

  async createBugFromValidationFailure(input: {
    parentIssueKey: string;
    affectedIssueKeys?: string[];
    validationIssueKey?: string;
    summary: string;
    actualBehavior: string;
    expectedBehavior: string;
    reproductionSteps: string[];
    environment?: string;
    evidence?: string[];
  }): Promise<BugCreationPlan & { createdIssue: { key: string; id: string } }> {
    const plan = await this.planBugFromValidationFailure(input);
    const createdIssue = await this.jiraApi.createIssue(plan.createPayload);

    for (const linkPlan of plan.linkPlans) {
      await this.jiraApi.linkIssues({
        typeName: linkPlan.typeName,
        inwardIssueKey:
          linkPlan.inwardIssueKey === "__CREATED_ISSUE__"
            ? createdIssue.key
            : linkPlan.inwardIssueKey,
        outwardIssueKey:
          linkPlan.outwardIssueKey === "__CREATED_ISSUE__"
            ? createdIssue.key
            : linkPlan.outwardIssueKey,
        comment: "Linked by the Jira quality-control flow."
      });
    }

    if (plan.parentStatusCorrection?.transitionId) {
      await this.jiraApi.transitionIssue({
        issueKey: input.parentIssueKey,
        transitionId: plan.parentStatusCorrection.transitionId,
        comment: `Status corrected by the Jira quality-control flow after failed validation created ${createdIssue.key}.`
      });
    }

    return {
      ...plan,
      createdIssue: {
        key: createdIssue.key,
        id: createdIssue.id
      }
    };
  }

  async planRetestLoop(input: {
    parentIssueKey: string;
    bugIssueKey: string;
    validationIssueKey?: string;
  }): Promise<RetestLoopPlan> {
    const [parentIssue, bugIssue, validationIssue] = await Promise.all([
      this.loadIssue(input.parentIssueKey),
      this.loadIssue(input.bugIssueKey),
      input.validationIssueKey
        ? this.loadIssue(input.validationIssueKey)
        : Promise.resolve(undefined)
    ]);
    const projectKey = parentIssue.fields?.project?.key;

    if (!projectKey) {
      throw new Error(`Could not resolve project for ${input.parentIssueKey}.`);
    }

    const bugSemantic = inferWorkflowSemantic({
      statusName: bugIssue.fields?.status?.name,
      statusCategoryKey: bugIssue.fields?.status?.statusCategory?.key
    });
    const parentSemantic = inferWorkflowSemantic({
      statusName: parentIssue.fields?.status?.name,
      statusCategoryKey: parentIssue.fields?.status?.statusCategory?.key
    });
    const validationSemantic = validationIssue
      ? inferWorkflowSemantic({
          statusName: validationIssue.fields?.status?.name,
          statusCategoryKey: validationIssue.fields?.status?.statusCategory?.key
        })
      : undefined;
    const notes: string[] = [];
    let nextAction: RetestLoopPlan["nextAction"];

    if (bugSemantic !== "done") {
      nextAction = "continue-bug-fix";
      notes.push("The linked bug is not done yet, so retest should wait for the fix.");
    } else if (validationIssue && validationSemantic !== "done") {
      nextAction = "retest-existing-validation";
      notes.push(
        "A validation item already exists and is not done, so it should be reused for retest."
      );
    } else if (!validationIssue) {
      nextAction = "generate-validation-work";
      notes.push(
        "No validation item is linked yet, so the safest next step is to generate explicit validation work."
      );
    } else {
      nextAction = "re-evaluate-parent-readiness";
      notes.push(
        "The bug is done and validation is already complete, so the parent item should be re-evaluated for readiness/closure."
      );
    }

    if (parentSemantic === "done" && bugSemantic !== "done") {
      notes.push(
        "The parent item already looks done while the bug remains open. The quality flow should review whether the parent needs to move out of done."
      );
    }

    return {
      parentIssueKey: input.parentIssueKey,
      bugIssueKey: input.bugIssueKey,
      ...(input.validationIssueKey ? { validationIssueKey: input.validationIssueKey } : {}),
      nextAction,
      notes,
      projectKey,
      statuses: {
        ...(parentIssue.fields?.status?.name
          ? { parent: parentIssue.fields.status.name }
          : {}),
        ...(bugIssue.fields?.status?.name
          ? { bug: bugIssue.fields.status.name }
          : {}),
        ...(validationIssue?.fields?.status?.name
          ? { validation: validationIssue.fields.status.name }
          : {})
      }
    };
  }

  private async loadIssue(issueKey: string): Promise<IssueWithFields> {
    return (await this.jiraApi.getIssue(issueKey, [
      "summary",
      "description",
      "issuetype",
      "project",
      "status",
      "labels",
      "parent"
    ])) as IssueWithFields;
  }

  private async resolveIssueTypeStrategy(input: {
    projectKey: string;
    requestedTypeNames: string[];
    fallbackType: string;
    fallbackLabels: string[];
  }): Promise<ValidationWorkPlan["issueTypeStrategy"]> {
    const plan = await this.adminCapabilityService.planIssueTypeEnablement(
      input.projectKey,
      input.requestedTypeNames
    );
    const matched = plan.capabilities.find((item) => item.available);

    if (matched?.matchedIssueType?.name) {
      return {
        preferredTypeNames: input.requestedTypeNames,
        selectedIssueType: matched.matchedIssueType.name,
        fallbackUsed: false,
        labels: [],
        notes: matched.notes
      };
    }

    return {
      preferredTypeNames: input.requestedTypeNames,
      selectedIssueType: input.fallbackType,
      fallbackUsed: true,
      labels: input.fallbackLabels,
      notes: plan.capabilities.flatMap((item) => item.notes)
    };
  }

  private async planParentStatusCorrection(
    issueKey: string,
    issue: IssueWithFields
  ): Promise<BugCreationPlan["parentStatusCorrection"] | undefined> {
    const currentSemantic = inferWorkflowSemantic({
      statusName: issue.fields?.status?.name,
      statusCategoryKey: issue.fields?.status?.statusCategory?.key
    });

    if (
      currentSemantic === "in_progress" ||
      currentSemantic === "blocked" ||
      currentSemantic === "todo" ||
      currentSemantic === "backlog" ||
      currentSemantic === "unknown"
    ) {
      return undefined;
    }

    const preferredTargetSemantics =
      currentSemantic === "done"
        ? (["in_progress", "ready", "todo"] as const)
        : (["in_progress", "ready"] as const);
    const transitions = await this.jiraApi.getTransitions(issueKey);

    for (const targetSemantic of preferredTargetSemantics) {
      const match = transitions.transitions.find((transition) => {
        const semantic = inferWorkflowSemantic({
          statusName: transition.to?.name,
          statusCategoryKey: transition.to?.statusCategory?.key
        });
        return semantic === targetSemantic;
      });

      if (match?.id && match.name) {
        return {
          currentSemantic,
          targetSemantic,
          transitionId: match.id,
          transitionName: match.name,
          manualStepRequired: false,
          notes: [
            `The parent issue should move from '${currentSemantic}' to '${targetSemantic}' after failed validation.`
          ]
        };
      }
    }

    return {
      currentSemantic,
      targetSemantic:
        currentSemantic === "done" ? "todo" : "in_progress",
      manualStepRequired: true,
      notes: [
        `The parent issue is currently '${currentSemantic}', but no safe transition back to an active or ready state could be resolved automatically.`,
        "A manual Jira workflow step may be required to reflect the failed validation correctly."
      ]
    };
  }

  private async selectLinkType(preferredNames: string[]): Promise<{
    name: string;
  }> {
    const linkTypes = await this.jiraApi.getIssueLinkTypes();
    const available = linkTypes.issueLinkTypes ?? [];

    for (const preferredName of preferredNames) {
      const match = available.find(
        (item) => normalize(item.name) === normalize(preferredName)
      );

      if (match?.name) {
        return { name: match.name };
      }
    }

    const fallback = available[0]?.name;

    if (!fallback) {
      throw new Error("No Jira issue link type is available for the quality flow.");
    }

    return { name: fallback };
  }
}

function normalize(value?: string): string {
  return (value ?? "").trim().toLowerCase();
}
