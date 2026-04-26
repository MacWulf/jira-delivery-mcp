import type {
  DeliveryHelperFallbackResult,
  DeliveryHelperOperation
} from "../domain/delivery-helper-reconciliation.js";
import type { IssueReadinessStage } from "../policy/readiness-policy.js";
import type { IssueStateReconciliationService } from "./issue-state-reconciliation-service.js";

export class DeliveryHelperReconciliationService {
  constructor(
    private readonly reconciliationService: IssueStateReconciliationService
  ) {}

  async resolveFailure(input: {
    issueKey: string;
    operation: DeliveryHelperOperation;
    normalFailure: string;
    confirm?: boolean;
    allowApply: boolean;
  }): Promise<DeliveryHelperFallbackResult> {
    const plan = await this.reconciliationService.planIssueStateReconciliation({
      issueKey: input.issueKey,
      intentStage: mapOperationToStage(input.operation)
    });

    if (plan.status === "ready_to_apply") {
      if (plan.riskLevel === "high" && input.confirm !== true) {
        return {
          issueKey: input.issueKey,
          operation: input.operation,
          resultType: "reconciliation_plan_required",
          normalFailure: input.normalFailure,
          reconciliationAttempted: true,
          reconciliationPlan: plan,
          manualStepRequired: false,
          confirmationRequired: true,
          message: `${capitalize(input.operation)} helper is supported, but normal delivery flow blocked and the best reconciliation path is risky. Review the reconciliation plan and retry with confirm=true if you want to apply it.`
        };
      }

      if (!input.allowApply) {
        return {
          issueKey: input.issueKey,
          operation: input.operation,
          resultType: "reconciliation_plan_required",
          normalFailure: input.normalFailure,
          reconciliationAttempted: true,
          reconciliationPlan: plan,
          manualStepRequired: false,
          confirmationRequired: plan.confirmationRequired,
          message: `${capitalize(input.operation)} helper found a reconciliation candidate, but the runtime is in preview mode so no live state change was applied.`
        };
      }

      const result = await this.reconciliationService.applyIssueStateReconciliation(
        {
          issueKey: input.issueKey,
          intentStage: mapOperationToStage(input.operation)
        }
      );

      return {
        issueKey: input.issueKey,
        operation: input.operation,
        resultType: "reconciliation_applied",
        normalFailure: input.normalFailure,
        reconciliationAttempted: true,
        reconciliationPlan: plan,
        reconciliationResult: result,
        manualStepRequired: false,
        confirmationRequired: false,
        message: `${capitalize(input.operation)} helper could not continue through the normal delivery path, so workflow-state reconciliation aligned the issue to ${result.targetSemantic ?? "the inferred target state"}.`
      };
    }

    if (plan.blockCategory === "missing_workflow_path") {
      return {
        issueKey: input.issueKey,
        operation: input.operation,
        resultType: "workflow_admin_required",
        normalFailure: input.normalFailure,
        reconciliationAttempted: true,
        reconciliationPlan: plan,
        manualStepRequired: true,
        confirmationRequired: false,
        message: `${capitalize(input.operation)} helper found a workflow-state mismatch, but the project workflow does not expose a safe path to align the issue. Jira workflow administration is required.`
      };
    }

    if (
      plan.blockCategory === "human_gate" ||
      plan.blockCategory === "tenant_or_api_limitation" ||
      plan.blockCategory === "manual_jira_step_required"
    ) {
      return {
        issueKey: input.issueKey,
        operation: input.operation,
        resultType: "manual_step_required",
        normalFailure: input.normalFailure,
        reconciliationAttempted: true,
        reconciliationPlan: plan,
        manualStepRequired: true,
        confirmationRequired: false,
        message: `${capitalize(input.operation)} helper found a potential workflow-state mismatch, but a manual Jira step is still required before the issue can be aligned safely.`
      };
    }

    return {
      issueKey: input.issueKey,
      operation: input.operation,
      resultType: "normal_block",
      normalFailure: input.normalFailure,
      reconciliationAttempted: true,
      reconciliationPlan: plan,
      manualStepRequired: false,
      confirmationRequired: false,
      message: `${capitalize(input.operation)} helper is blocked for a valid delivery reason, and workflow-state reconciliation is not appropriate yet.`
    };
  }
}

function mapOperationToStage(
  operation: DeliveryHelperOperation
): IssueReadinessStage {
  switch (operation) {
    case "start":
    case "sync":
      return "start";
    case "close":
      return "close";
    default:
      return "start";
  }
}

function capitalize(value: string): string {
  return value.length > 0
    ? `${value.charAt(0).toUpperCase()}${value.slice(1)}`
    : value;
}
