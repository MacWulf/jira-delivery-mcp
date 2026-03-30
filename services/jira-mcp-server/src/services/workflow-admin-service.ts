import {
  buildCodexManagedWorkflowUpdate,
  getCodexWorkflowTargetStatuses
} from "../domain/codex-workflow-template.js";
import type {
  JiraApi,
  JiraWorkflowDefinition,
  JiraWorkflowStatusDefinition,
  JiraWorkflowUpdateRequest
} from "./jira-api.js";

export type WorkflowPolicyPlan = {
  project: {
    id: string;
    key: string;
    name?: string;
  };
  workflow: {
    id: string;
    name: string;
    versionId: string;
    versionNumber: number;
  };
  createdStatuses: JiraWorkflowStatusDefinition[];
  targetStatusNames: string[];
  validationErrors: Array<{
    code?: string;
    level?: "ERROR" | "WARNING";
    message?: string;
    type?: string;
  }>;
  payload: JiraWorkflowUpdateRequest;
};

export type WorkflowValidationSummary = {
  errors: Array<{
    code?: string;
    level?: "ERROR" | "WARNING";
    message?: string;
    type?: string;
  }>;
};

export class WorkflowAdminService {
  constructor(private readonly jiraApi: JiraApi) {}

  async planCodexManagedProjectWorkflow(
    projectKey: string
  ): Promise<WorkflowPolicyPlan> {
    const project = await this.jiraApi.getProject(projectKey);
    const projectId = project.id;
    const projectRealKey = project.key;

    if (!projectId || !projectRealKey) {
      throw new Error(`Could not resolve Jira project metadata for ${projectKey}.`);
    }

    const createdStatuses = await this.ensureTargetStatuses(projectId);
    const workflow = await this.loadSingleProjectWorkflow(projectId);
    const availableStatuses = await this.listProjectStatuses(projectId);
    const payload = buildCodexManagedWorkflowUpdate({
      projectId,
      workflow,
      availableStatuses
    });
    const validation = await this.jiraApi.validateWorkflowUpdate({
      payload,
      validationOptions: {
        levels: ["ERROR", "WARNING"]
      }
    });

    return {
      project: {
        id: projectId,
        key: projectRealKey,
        ...(project.name ? { name: project.name } : {})
      },
      workflow: {
        id: workflow.id,
        name: workflow.name,
        versionId: workflow.version.id,
        versionNumber: workflow.version.versionNumber
      },
      createdStatuses,
      targetStatusNames: getCodexWorkflowTargetStatuses().map((item) => item.name),
      validationErrors: (validation.errors ?? []).map((error) => ({
        ...(error.code ? { code: error.code } : {}),
        ...(error.level ? { level: error.level } : {}),
        ...(error.message ? { message: error.message } : {}),
        ...(error.type ? { type: error.type } : {})
      })),
      payload
    };
  }

  async applyCodexManagedProjectWorkflow(
    projectKey: string
  ): Promise<WorkflowPolicyPlan & { taskId?: string }> {
    const plan = await this.planCodexManagedProjectWorkflow(projectKey);
    const errorLevelFindings = plan.validationErrors.filter(
      (item) => item.level === "ERROR"
    );

    if (errorLevelFindings.length > 0) {
      throw new Error(
        `Workflow update validation failed for ${projectKey}: ${errorLevelFindings
          .map((item) => item.message ?? item.code ?? "Unknown validation error")
          .join("; ")}`
      );
    }

    const update = await this.jiraApi.updateWorkflow(plan.payload);

    return {
      ...plan,
      ...(update.taskId ? { taskId: update.taskId } : {})
    };
  }

  async validateStandardTeamManagedWorkflow(projectKey: string): Promise<{
    plan: WorkflowPolicyPlan;
    validation: WorkflowValidationSummary;
  }> {
    const plan = await this.planCodexManagedProjectWorkflow(projectKey);

    return {
      plan,
      validation: {
        errors: plan.validationErrors
      }
    };
  }

  async applyStandardTeamManagedWorkflow(projectKey: string): Promise<{
    plan: WorkflowPolicyPlan;
    validation: WorkflowValidationSummary;
    taskId?: string;
  }> {
    const result = await this.applyCodexManagedProjectWorkflow(projectKey);

    return {
      plan: result,
      validation: {
        errors: result.validationErrors
      },
      ...(result.taskId ? { taskId: result.taskId } : {})
    };
  }

  private async ensureTargetStatuses(
    projectId: string
  ): Promise<JiraWorkflowStatusDefinition[]> {
    const existingStatuses = await this.listProjectStatuses(projectId);
    const existingNames = new Set(existingStatuses.map((status) => status.name));
    const createdStatuses: JiraWorkflowStatusDefinition[] = [];

    for (const target of getCodexWorkflowTargetStatuses()) {
      if (existingNames.has(target.name)) {
        continue;
      }

      const created = await this.jiraApi.createProjectStatus({
        projectId,
        name: target.name,
        statusCategory: target.statusCategory,
        description: target.description
      });

      existingNames.add(target.name);
      createdStatuses.push(created);
    }

    return createdStatuses;
  }

  private async listProjectStatuses(
    projectId: string
  ): Promise<JiraWorkflowStatusDefinition[]> {
    return (await this.jiraApi.searchProjectStatuses(projectId)).values ?? [];
  }

  private async loadSingleProjectWorkflow(
    projectId: string
  ): Promise<JiraWorkflowDefinition> {
    const search = await this.jiraApi.searchProjectWorkflows(projectId);
    const workflowId = search.values?.find(
      (item) => item.scope?.project?.id === projectId
    )?.id;

    if (!workflowId) {
      throw new Error(`No editable project-scoped workflow found for project ${projectId}.`);
    }

    const bulk = await this.jiraApi.getWorkflows({
      workflowIds: [workflowId]
    });
    const workflow = bulk.workflows?.[0];

    if (!workflow) {
      throw new Error(`Could not load workflow definition ${workflowId}.`);
    }

    return workflow;
  }
}
