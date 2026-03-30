import type { AppConfig } from "../config.js";
import { JiraAssistantService } from "../services/jira-assistant-service.js";
import { DependencyDriftService } from "../services/dependency-drift-service.js";
import type { JiraApi } from "../services/jira-api.js";
import { ProjectBootstrapService } from "../services/project-bootstrap-service.js";
import { ProjectKickoffService } from "../services/project-kickoff-service.js";
import { WorkflowAdminService } from "../services/workflow-admin-service.js";
import { WorkflowDiscoveryService } from "../services/workflow-discovery-service.js";
import { registerAddCommentTool } from "./add-comment.js";
import { registerAddWorklogTool } from "./add-worklog.js";
import { registerApplyStandardProjectWorkflowTool } from "./apply-standard-project-workflow.js";
import { registerBootstrapProjectFromTemplateTool } from "./bootstrap-project-from-template.js";
import { registerBootstrapSoftwareProjectTool } from "./bootstrap-software-project.js";
import { registerCloseIssueIfReadyTool } from "./close-issue-if-ready.js";
import { registerCreateDocPageTool } from "./create-doc-page.js";
import { registerCreateIssueTool } from "./create-issue.js";
import { registerAnalyzeDependencyDriftTool } from "./analyze-dependency-drift.js";
import { registerDiscoverProjectWorkflowTool } from "./discover-project-workflow.js";
import { registerGetTransitionsTool } from "./get-transitions.js";
import { registerGetIssueLinkTypesTool } from "./get-issue-link-types.js";
import { registerGetIssueTool } from "./get-issue.js";
import { registerGetProjectAdminSnapshotTool } from "./get-project-admin-snapshot.js";
import { registerGetProjectTool } from "./get-project.js";
import { registerHandoffIssueTool } from "./handoff-issue.js";
import { registerLinkIssuesTool } from "./link-issues.js";
import { registerListProjectsTool } from "./list-projects.js";
import { registerListWorkflowSchemesTool } from "./list-workflow-schemes.js";
import { registerMarkIssueBlockedTool } from "./mark-issue-blocked.js";
import { registerPickNextIssueTool } from "./pick-next-issue.js";
import { registerPreviewStandardProjectWorkflowTool } from "./preview-standard-project-workflow.js";
import { registerSearchIssuesTool } from "./search-issues.js";
import { registerSeedProjectKickoffTool } from "./seed-project-kickoff.js";
import { registerSelectIssueForWorkTool } from "./select-issue-for-work.js";
import { registerSendIssueToQaTool } from "./send-issue-to-qa.js";
import { registerStartIssueWorkTool } from "./start-issue-work.js";
import { registerTransitionIssueByNameTool } from "./transition-issue-by-name.js";
import { registerTransitionIssueTool } from "./transition-issue.js";
import { registerUpdateIssueTool } from "./update-issue.js";

export function registerTools(
  server: { registerTool: Function },
  jiraApi: JiraApi,
  config: AppConfig
): void {
  const assistantService = new JiraAssistantService(jiraApi, config);
  const bootstrapService = new ProjectBootstrapService();
  const dependencyDriftService = new DependencyDriftService(jiraApi, config);
  const workflowAdminService = new WorkflowAdminService(jiraApi);
  const workflowDiscoveryService = new WorkflowDiscoveryService(jiraApi);
  const kickoffService = new ProjectKickoffService(
    jiraApi,
    assistantService,
    config
  );

  registerListProjectsTool(server, jiraApi);
  registerGetProjectTool(server, jiraApi);
  registerGetProjectAdminSnapshotTool(server, jiraApi);
  registerListWorkflowSchemesTool(server, jiraApi);
  registerDiscoverProjectWorkflowTool(server, workflowDiscoveryService);
  registerPreviewStandardProjectWorkflowTool(server, workflowAdminService);
  registerApplyStandardProjectWorkflowTool(
    server,
    workflowAdminService,
    config
  );
  registerAnalyzeDependencyDriftTool(server, dependencyDriftService);
  registerGetIssueTool(server, jiraApi);
  registerGetIssueLinkTypesTool(server, jiraApi);
  registerSearchIssuesTool(server, jiraApi);
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
  registerTransitionIssueByNameTool(server, jiraApi, config);
  registerTransitionIssueTool(server, jiraApi, config);
  registerSelectIssueForWorkTool(server, jiraApi, assistantService, config);
  registerStartIssueWorkTool(server, jiraApi, assistantService, config);
  registerHandoffIssueTool(server, jiraApi, assistantService, config);
  registerSendIssueToQaTool(server, jiraApi, assistantService, config);
  registerMarkIssueBlockedTool(server, jiraApi, assistantService, config);
  registerCloseIssueIfReadyTool(server, jiraApi, assistantService, config);
  registerLinkIssuesTool(server, jiraApi, config);
  registerAddCommentTool(server, jiraApi, config);
  registerAddWorklogTool(server, jiraApi, config);
  registerPickNextIssueTool(server, jiraApi, config);
  registerSeedProjectKickoffTool(server, kickoffService, config);
  registerCreateDocPageTool(server, jiraApi, config);
}
