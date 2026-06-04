import type { AppConfig } from "../config.js";
import { ConfluenceApi } from "../services/confluence-api.js";
import { AdminCapabilityService } from "../services/admin-capability-service.js";
import { ChangeControlService } from "../services/change-control-service.js";
import { DocumentGovernanceService } from "../services/document-governance-service.js";
import { DocumentPublishingService } from "../services/document-publishing-service.js";
import { DeliveryHelperReconciliationService } from "../services/delivery-helper-reconciliation-service.js";
import { IssueStateReconciliationService } from "../services/issue-state-reconciliation-service.js";
import { JiraAssistantService } from "../services/jira-assistant-service.js";
import { DependencyDriftService } from "../services/dependency-drift-service.js";
import { IssueProgressService } from "../services/issue-progress-service.js";
import type { JiraApi } from "../services/jira-api.js";
import { ProjectBootstrapService } from "../services/project-bootstrap-service.js";
import { ProjectKickoffService } from "../services/project-kickoff-service.js";
import { QualityControlService } from "../services/quality-control-service.js";
import { QualityGovernanceService } from "../services/quality-governance-service.js";
import { ReadinessPolicyService } from "../services/readiness-policy-service.js";
import { WorkflowAdminService } from "../services/workflow-admin-service.js";
import { WorkflowDiscoveryService } from "../services/workflow-discovery-service.js";
import { registerAddCommentTool } from "./add-comment.js";
import { registerAddWorklogTool } from "./add-worklog.js";
import { registerApplyStandardProjectWorkflowTool } from "./apply-standard-project-workflow.js";
import { registerApplyIssueStateReconciliationTool } from "./apply-issue-state-reconciliation.js";
import { registerAnalyzeChangeImpactTool } from "./analyze-change-impact.js";
import { registerClassifyIncomingChangeTool } from "./classify-incoming-change.js";
import { registerCreateBugFromValidationFailureTool } from "./create-bug-from-validation-failure.js";
import { registerBootstrapProjectFromTemplateTool } from "./bootstrap-project-from-template.js";
import { registerBootstrapSoftwareProjectTool } from "./bootstrap-software-project.js";
import { registerCloseIssueIfReadyTool } from "./close-issue-if-ready.js";
import { registerCreateDocPageTool } from "./create-doc-page.js";
import { registerCreateIssueTool } from "./create-issue.js";
import { registerAnalyzeDependencyDriftTool } from "./analyze-dependency-drift.js";
import { registerAnalyzeDocStalenessTool } from "./analyze-doc-staleness.js";
import { registerDiscoverIssueTypeCapabilitiesTool } from "./discover-issue-type-capabilities.js";
import { registerDiscoverProjectWorkflowTool } from "./discover-project-workflow.js";
import { registerEnsureCustomFieldAvailableTool } from "./ensure-custom-field-available.js";
import { registerEnsureArchitectAdrPageTool } from "./ensure-architect-adr-page.js";
import { registerEnsureIssueTypeAvailableTool } from "./ensure-issue-type-available.js";
import { registerEnsureProjectDocPageTool } from "./ensure-project-doc-page.js";
import { registerEvaluateArchitectActivationTool } from "./evaluate-architect-activation.js";
import { registerEvaluateIssueReadinessTool } from "./evaluate-issue-readiness.js";
import { registerEvaluateWritePolicyTool } from "./evaluate-write-policy.js";
import { registerGenerateValidationWorkTool } from "./generate-validation-work.js";
import { registerGetDocPageTool } from "./get-doc-page.js";
import { registerGetDocSpaceProfileTool } from "./get-doc-space-profile.js";
import { registerGetTransitionsTool } from "./get-transitions.js";
import { registerGetIssueLinkTypesTool } from "./get-issue-link-types.js";
import { registerGetIssueTool } from "./get-issue.js";
import { registerGetProjectAdminSnapshotTool } from "./get-project-admin-snapshot.js";
import { registerGetProjectTool } from "./get-project.js";
import { registerHandoffIssueTool } from "./handoff-issue.js";
import { registerLinkIssuesTool } from "./link-issues.js";
import { registerListDocSpacesTool } from "./list-doc-spaces.js";
import { registerListProjectsTool } from "./list-projects.js";
import { registerListWorkflowSchemesTool } from "./list-workflow-schemes.js";
import { registerMarkIssueBlockedTool } from "./mark-issue-blocked.js";
import { registerPickNextIssueTool } from "./pick-next-issue.js";
import { registerPlanFieldPolicyTool } from "./plan-field-policy.js";
import { registerPlanArchitectAdrPageTool } from "./plan-architect-adr-page.js";
import { registerPlanArchitectDecisionSafetyTool } from "./plan-architect-decision-safety.js";
import { registerPlanBugTriageTool } from "./plan-bug-triage.js";
import { registerPlanChangeDecisionLogTool } from "./plan-change-decision-log.js";
import { registerPlanChangeExecutionTool } from "./plan-change-execution.js";
import { registerPlanDocGovernanceTool } from "./plan-doc-governance.js";
import { registerPlanDocIndexPagesTool } from "./plan-doc-index-pages.js";
import { registerPlanDocMetadataPolicyTool } from "./plan-doc-metadata-policy.js";
import { registerPlanDocRemediationTool } from "./plan-doc-remediation.js";
import { registerPlanIssueTypeEnablementTool } from "./plan-issue-type-enablement.js";
import { registerPlanProjectDocPageTool } from "./plan-project-doc-page.js";
import { registerPlanQualityQueuesTool } from "./plan-quality-queues.js";
import { registerPlanIssueStateReconciliationTool } from "./plan-issue-state-reconciliation.js";
import { registerPlanRetestLoopTool } from "./plan-retest-loop.js";
import { registerPreviewStandardProjectWorkflowTool } from "./preview-standard-project-workflow.js";
import { registerSearchIssuesTool } from "./search-issues.js";
import { registerSeedProjectKickoffTool } from "./seed-project-kickoff.js";
import { registerSelectIssueForWorkTool } from "./select-issue-for-work.js";
import { registerSendIssueToQaTool } from "./send-issue-to-qa.js";
import { registerSearchDocPagesTool } from "./search-doc-pages.js";
import { registerStartIssueWorkTool } from "./start-issue-work.js";
import { registerTransitionIssueByNameTool } from "./transition-issue-by-name.js";
import { registerTransitionIssueTool } from "./transition-issue.js";
import { registerUpdateDocPageTool } from "./update-doc-page.js";
import { registerUpdateIssueTool } from "./update-issue.js";
import { registerEvaluateChangeApprovalTool } from "./evaluate-change-approval.js";
import { registerSyncIssueProgressTool } from "./sync-issue-progress.js";

export function registerTools(
  server: { registerTool: Function },
  jiraApi: JiraApi,
  config: AppConfig
): void {
  const adminCapabilityService = new AdminCapabilityService(jiraApi);
  const assistantService = new JiraAssistantService(jiraApi, config);
  const bootstrapService = new ProjectBootstrapService();
  const changeControlService = new ChangeControlService(jiraApi);
  const confluenceApi = new ConfluenceApi(config);
  const dependencyDriftService = new DependencyDriftService(jiraApi, config);
  const documentGovernanceService = new DocumentGovernanceService(confluenceApi);
  const documentPublishingService = new DocumentPublishingService(
    confluenceApi,
    jiraApi,
    config
  );
  const workflowDiscoveryService = new WorkflowDiscoveryService(jiraApi);
  const issueProgressService = new IssueProgressService(
    jiraApi,
    assistantService
  );
  const issueStateReconciliationService = new IssueStateReconciliationService(
    jiraApi,
    workflowDiscoveryService
  );
  const deliveryHelperReconciliationService =
    new DeliveryHelperReconciliationService(issueStateReconciliationService);
  const qualityControlService = new QualityControlService(
    jiraApi,
    adminCapabilityService
  );
  const qualityGovernanceService = new QualityGovernanceService(
    adminCapabilityService
  );
  const workflowAdminService = new WorkflowAdminService(jiraApi);
  const readinessPolicyService = new ReadinessPolicyService(jiraApi);
  const kickoffService = new ProjectKickoffService(
    jiraApi,
    assistantService,
    config,
    qualityControlService
  );

  registerListProjectsTool(server, jiraApi);
  registerListDocSpacesTool(server, documentPublishingService);
  registerEvaluateWritePolicyTool(server, config);
  registerGetProjectTool(server, jiraApi);
  registerGetProjectAdminSnapshotTool(server, jiraApi);
  registerDiscoverIssueTypeCapabilitiesTool(server, adminCapabilityService);
  registerPlanIssueTypeEnablementTool(server, adminCapabilityService);
  registerPlanFieldPolicyTool(server, adminCapabilityService);
  registerPlanBugTriageTool(server, qualityGovernanceService);
  registerPlanQualityQueuesTool(server, qualityGovernanceService);
  registerEnsureIssueTypeAvailableTool(
    server,
    adminCapabilityService,
    config
  );
  registerEnsureCustomFieldAvailableTool(
    server,
    adminCapabilityService,
    config
  );
  registerListWorkflowSchemesTool(server, jiraApi);
  registerDiscoverProjectWorkflowTool(server, workflowDiscoveryService);
  registerEvaluateIssueReadinessTool(server, readinessPolicyService);
  registerEvaluateArchitectActivationTool(server, jiraApi);
  registerPreviewStandardProjectWorkflowTool(server, workflowAdminService);
  registerApplyStandardProjectWorkflowTool(
    server,
    workflowAdminService,
    config
  );
  registerClassifyIncomingChangeTool(server, changeControlService);
  registerAnalyzeChangeImpactTool(server, changeControlService);
  registerPlanChangeExecutionTool(server, changeControlService);
  registerPlanChangeDecisionLogTool(server, changeControlService);
  registerEvaluateChangeApprovalTool(server, changeControlService);
  registerAnalyzeDependencyDriftTool(server, dependencyDriftService);
  registerAnalyzeDocStalenessTool(server, documentGovernanceService);
  registerPlanIssueStateReconciliationTool(
    server,
    issueStateReconciliationService
  );
  registerGetIssueTool(server, jiraApi);
  registerGetDocPageTool(server, documentPublishingService);
  registerGetDocSpaceProfileTool(server, documentGovernanceService);
  registerGetIssueLinkTypesTool(server, jiraApi);
  registerSearchIssuesTool(server, jiraApi);
  registerSearchDocPagesTool(server, documentPublishingService);
  registerBootstrapProjectFromTemplateTool(server, jiraApi, config);
  registerBootstrapSoftwareProjectTool(
    server,
    jiraApi,
    bootstrapService,
    config
  );
  registerCreateIssueTool(server, jiraApi, config);
  registerUpdateIssueTool(server, jiraApi, config);
  registerGetTransitionsTool(server, jiraApi);
  registerTransitionIssueByNameTool(server, jiraApi, assistantService, config);
  registerTransitionIssueTool(server, jiraApi, assistantService, config);
  registerSelectIssueForWorkTool(server, jiraApi, assistantService, config);
  registerStartIssueWorkTool(
    server,
    jiraApi,
    assistantService,
    deliveryHelperReconciliationService,
    config
  );
  registerSyncIssueProgressTool(
    server,
    issueProgressService,
    jiraApi,
    deliveryHelperReconciliationService,
    config
  );
  registerApplyIssueStateReconciliationTool(
    server,
    issueStateReconciliationService,
    config
  );
  registerHandoffIssueTool(server, jiraApi, assistantService, config);
  registerSendIssueToQaTool(server, jiraApi, assistantService, config);
  registerMarkIssueBlockedTool(server, jiraApi, assistantService, config);
  registerCloseIssueIfReadyTool(
    server,
    jiraApi,
    assistantService,
    deliveryHelperReconciliationService,
    config
  );
  registerGenerateValidationWorkTool(server, qualityControlService, config);
  registerCreateBugFromValidationFailureTool(
    server,
    qualityControlService,
    config
  );
  registerPlanRetestLoopTool(server, qualityControlService);
  registerPlanProjectDocPageTool(server, documentPublishingService);
  registerPlanArchitectAdrPageTool(server, documentPublishingService);
  registerPlanArchitectDecisionSafetyTool(server, documentPublishingService);
  registerPlanDocGovernanceTool(server, documentGovernanceService);
  registerPlanDocMetadataPolicyTool(server, documentGovernanceService);
  registerPlanDocIndexPagesTool(server, documentGovernanceService);
  registerPlanDocRemediationTool(server, documentGovernanceService);
  registerLinkIssuesTool(server, jiraApi, config);
  registerAddCommentTool(server, jiraApi, config);
  registerAddWorklogTool(server, jiraApi, config);
  registerPickNextIssueTool(server, jiraApi, config);
  registerSeedProjectKickoffTool(server, kickoffService, config);
  registerCreateDocPageTool(server, confluenceApi, config);
  registerUpdateDocPageTool(server, documentPublishingService, config);
  registerEnsureProjectDocPageTool(server, documentPublishingService, config);
  registerEnsureArchitectAdrPageTool(
    server,
    documentPublishingService,
    config
  );
}
