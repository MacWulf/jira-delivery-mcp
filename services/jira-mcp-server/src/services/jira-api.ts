import type { AppConfig } from "../config.js";
import { textToAdf } from "../domain/adf.js";
import { basicAuthHeader, requestJson } from "../lib/http.js";

type JiraSearchResponse = {
  issues: Array<Record<string, unknown>>;
};

type JiraTransitionsResponse = {
  transitions: Array<{
    id: string;
    name: string;
    to?: {
      id?: string;
      name?: string;
      statusCategory?: {
        key?: string;
        name?: string;
      };
    };
  }>;
};

type JiraCreateIssueResponse = {
  id: string;
  key: string;
  self: string;
};

type JiraCommentResponse = {
  id: string;
  self: string;
};

type JiraMyselfResponse = {
  accountId?: string;
  emailAddress?: string;
  displayName?: string;
  active?: boolean;
};

type JiraProjectResponse = {
  id?: string;
  key?: string;
  name?: string;
  self?: string;
  simplified?: boolean;
  style?: string;
  projectTypeKey?: string;
  issueTypes?: JiraIssueTypeDefinition[];
};

type JiraProjectSearchResponse = {
  values?: Array<{
    id?: string;
    key?: string;
    name?: string;
  }>;
};

export type JiraIssueTypeDefinition = {
  self?: string;
  id?: string;
  description?: string;
  iconUrl?: string;
  name?: string;
  untranslatedName?: string;
  subtask?: boolean;
  avatarId?: number;
  entityId?: string;
  hierarchyLevel?: number;
  scope?: {
    type?: string;
    project?: {
      id?: string;
    };
  };
};

type JiraProjectIssueTypesResponse = {
  startAt?: number;
  maxResults?: number;
  total?: number;
  issueTypes?: JiraIssueTypeDefinition[];
};

export type JiraProjectStatusesResponse = Array<{
  self?: string;
  id?: string;
  name?: string;
  subtask?: boolean;
  statuses?: Array<{
    self?: string;
    description?: string;
    iconUrl?: string;
    name?: string;
    untranslatedName?: string;
    id?: string;
    statusCategory?: {
      self?: string;
      id?: number;
      key?: string;
      colorName?: string;
      name?: string;
    };
    scope?: {
      type?: string;
      project?: {
        id?: string;
      };
    };
  }>;
}>;

type JiraWorkflowSchemeResponse = {
  values?: Array<Record<string, unknown>>;
  startAt?: number;
  maxResults?: number;
  total?: number;
};

export type JiraWorkflowStatusDefinition = {
  id?: string;
  statusReference: string;
  name: string;
  statusCategory: "TODO" | "IN_PROGRESS" | "DONE";
  scope?: {
    type?: string;
    project?: {
      id?: string;
    };
  };
  description?: string;
};

export type JiraWorkflowTransitionDefinition = {
  id: string;
  type: "INITIAL" | "DIRECTED" | "GLOBAL";
  toStatusReference: string;
  links: Array<{
    fromStatusReference?: string;
    fromPort?: number;
    toPort?: number;
  }>;
  name: string;
  description?: string;
  actions: unknown[];
  validators: unknown[];
  triggers: unknown[];
  properties: Record<string, string>;
};

export type JiraWorkflowDefinition = {
  scope?: {
    type?: string;
    project?: {
      id?: string;
    };
  };
  version: {
    versionNumber: number;
    id: string;
  };
  id: string;
  name: string;
  description?: string;
  isEditable?: boolean;
  startPointLayout?: {
    x: number;
    y: number;
  };
  statuses: Array<{
    statusReference: string;
    layout?: {
      x: number;
      y: number;
    };
    properties?: Record<string, unknown>;
    deprecated?: boolean;
  }>;
  transitions: JiraWorkflowTransitionDefinition[];
  loopedTransitionContainerLayout?: Record<string, unknown>;
};

export type JiraWorkflowUpdateRequest = {
  statuses: JiraWorkflowStatusDefinition[];
  workflows: JiraWorkflowDefinition[];
};

type JiraWorkflowSearchResponse = {
  statuses?: JiraWorkflowStatusDefinition[];
  values?: JiraWorkflowDefinition[];
  maxResults?: number;
  startAt?: number;
  total?: number;
  isLast?: boolean;
  self?: string;
};

type JiraBulkWorkflowsResponse = {
  statuses?: JiraWorkflowStatusDefinition[];
  workflows?: JiraWorkflowDefinition[];
};

type JiraWorkflowValidationErrorList = {
  errors?: Array<{
    code?: string;
    level?: "ERROR" | "WARNING";
    message?: string;
    type?: string;
    elementReference?: Record<string, unknown>;
  }>;
};

type JiraStatusSearchResponse = {
  values?: JiraWorkflowStatusDefinition[];
  startAt?: number;
  total?: number;
  isLast?: boolean;
  maxResults?: number;
  self?: string;
};

type JiraIssueTypeSchemeResponse = {
  values?: Array<Record<string, unknown>>;
  startAt?: number;
  maxResults?: number;
  total?: number;
};

type JiraIssueLinkTypesResponse = {
  issueLinkTypes?: Array<{
    id?: string;
    name?: string;
    inward?: string;
    outward?: string;
  }>;
};

type JiraWorklogResponse = {
  id?: string;
  self?: string;
};

export type JiraIssueTypeFieldDefinition = {
  required?: boolean;
  schema?: {
    type?: string;
    system?: string;
    items?: string;
    custom?: string;
    customId?: number;
  };
  name?: string;
  key?: string;
  fieldId?: string;
  hasDefaultValue?: boolean;
  operations?: string[];
  typeDisplayName?: string;
  description?: string;
};

type JiraIssueTypeCreateMetaResponse = {
  startAt?: number;
  maxResults?: number;
  total?: number;
  fields?: JiraIssueTypeFieldDefinition[];
};

export type JiraFieldDefinition = {
  id?: string;
  key?: string;
  name?: string;
  description?: string;
  typeDisplayName?: string;
  schema?: {
    type?: string;
    system?: string;
    items?: string;
    custom?: string;
    customId?: number;
  };
  required?: boolean;
  hasDefaultValue?: boolean;
  operations?: string[];
  fieldId?: string;
};

type JiraFieldSearchResponse = {
  values?: JiraFieldDefinition[];
  startAt?: number;
  maxResults?: number;
  total?: number;
  isLast?: boolean;
};

export type JiraCustomFieldCreateResponse = {
  id?: string;
  key?: string;
  name?: string;
  description?: string;
  schema?: JiraFieldDefinition["schema"];
};

export class JiraApi {
  constructor(private readonly config: AppConfig) {}

  async getMyself(): Promise<JiraMyselfResponse> {
    return this.jiraRequest<JiraMyselfResponse>("/rest/api/3/myself", {
      method: "GET"
    });
  }

  async getProject(projectKey: string): Promise<JiraProjectResponse> {
    return this.jiraRequest<JiraProjectResponse>(
      `/rest/api/3/project/${projectKey}`,
      {
        method: "GET"
      }
    );
  }

  async getIssue(
    issueKey: string,
    fields: string[] = [
      "summary",
      "description",
      "status",
      "priority",
      "assignee",
      "issuetype",
      "project",
      "parent",
      "issuelinks",
      "updated"
    ]
  ): Promise<Record<string, unknown>> {
    const searchParams = new URLSearchParams();

    for (const field of fields) {
      searchParams.append("fields", field);
    }

    return this.jiraRequest<Record<string, unknown>>(
      `/rest/api/3/issue/${issueKey}?${searchParams.toString()}`,
      {
        method: "GET"
      }
    );
  }

  async searchProjects(query?: string): Promise<JiraProjectSearchResponse> {
    const searchParams = new URLSearchParams();

    if (query) {
      searchParams.set("query", query);
    }

    searchParams.set("maxResults", "20");

    return this.jiraRequest<JiraProjectSearchResponse>(
      `/rest/api/3/project/search?${searchParams.toString()}`,
      {
        method: "GET"
      }
    );
  }

  async getProjectStatuses(
    projectKey: string
  ): Promise<JiraProjectStatusesResponse> {
    return this.jiraRequest<JiraProjectStatusesResponse>(
      `/rest/api/3/project/${encodeURIComponent(projectKey)}/statuses`,
      {
        method: "GET"
      }
    );
  }

  async getProjectWorkflowSchemes(
    projectId: string
  ): Promise<JiraWorkflowSchemeResponse> {
    return this.jiraRequest<JiraWorkflowSchemeResponse>(
      `/rest/api/2/workflowscheme/project?projectId=${encodeURIComponent(projectId)}`,
      {
        method: "GET"
      }
    );
  }

  async listWorkflowSchemes(input?: {
    startAt?: number;
    maxResults?: number;
  }): Promise<JiraWorkflowSchemeResponse> {
    const searchParams = new URLSearchParams();

    if (input?.startAt !== undefined) {
      searchParams.set("startAt", String(input.startAt));
    }

    if (input?.maxResults !== undefined) {
      searchParams.set("maxResults", String(input.maxResults));
    }

    const suffix = searchParams.toString()
      ? `?${searchParams.toString()}`
      : "";

    return this.jiraRequest<JiraWorkflowSchemeResponse>(
      `/rest/api/2/workflowscheme${suffix}`,
      {
        method: "GET"
      }
    );
  }

  async getProjectIssueTypeSchemes(
    projectId: string
  ): Promise<JiraIssueTypeSchemeResponse> {
    return this.jiraRequest<JiraIssueTypeSchemeResponse>(
      `/rest/api/3/issuetypescheme/project?projectId=${encodeURIComponent(projectId)}`,
      {
        method: "GET"
      }
    );
  }

  async getProjectIssueTypes(
    projectKey: string
  ): Promise<JiraProjectIssueTypesResponse> {
    return this.jiraRequest<JiraProjectIssueTypesResponse>(
      `/rest/api/3/issue/createmeta/${encodeURIComponent(projectKey)}/issuetypes`,
      {
        method: "GET"
      }
    );
  }

  async getIssueTypeCreateMeta(input: {
    projectKey: string;
    issueTypeId: string;
    maxResults?: number;
  }): Promise<JiraIssueTypeCreateMetaResponse> {
    const searchParams = new URLSearchParams();

    if (input.maxResults !== undefined) {
      searchParams.set("maxResults", String(input.maxResults));
    }

    const suffix = searchParams.toString()
      ? `?${searchParams.toString()}`
      : "";

    return this.jiraRequest<JiraIssueTypeCreateMetaResponse>(
      `/rest/api/3/issue/createmeta/${encodeURIComponent(
        input.projectKey
      )}/issuetypes/${encodeURIComponent(input.issueTypeId)}${suffix}`,
      {
        method: "GET"
      }
    );
  }

  async searchFields(input?: {
    query?: string;
    startAt?: number;
    maxResults?: number;
  }): Promise<JiraFieldSearchResponse> {
    const searchParams = new URLSearchParams();

    if (input?.query) {
      searchParams.set("query", input.query);
    }

    if (input?.startAt !== undefined) {
      searchParams.set("startAt", String(input.startAt));
    }

    if (input?.maxResults !== undefined) {
      searchParams.set("maxResults", String(input.maxResults));
    }

    const suffix = searchParams.toString()
      ? `?${searchParams.toString()}`
      : "";

    return this.jiraRequest<JiraFieldSearchResponse>(
      `/rest/api/3/field/search${suffix}`,
      {
        method: "GET"
      }
    );
  }

  async createIssueType(input: {
    name: string;
    description?: string;
    type?: "standard" | "subtask";
    hierarchyLevel?: number;
  }): Promise<JiraIssueTypeDefinition> {
    return this.jiraRequest<JiraIssueTypeDefinition>("/rest/api/3/issuetype", {
      method: "POST",
      body: JSON.stringify({
        name: input.name,
        type: input.type ?? "standard",
        ...(input.description ? { description: input.description } : {}),
        ...(input.hierarchyLevel !== undefined
          ? { hierarchyLevel: input.hierarchyLevel }
          : {})
      })
    });
  }

  async createCustomField(input: {
    name: string;
    description?: string;
    type: string;
    searcherKey: string;
  }): Promise<JiraCustomFieldCreateResponse> {
    return this.jiraRequest<JiraCustomFieldCreateResponse>(
      "/rest/api/3/field",
      {
        method: "POST",
        body: JSON.stringify({
          name: input.name,
          type: input.type,
          searcherKey: input.searcherKey,
          ...(input.description ? { description: input.description } : {})
        })
      }
    );
  }

  async getIssueLinkTypes(): Promise<JiraIssueLinkTypesResponse> {
    return this.jiraRequest<JiraIssueLinkTypesResponse>(
      "/rest/api/3/issueLinkType",
      {
        method: "GET"
      }
    );
  }

  async searchIssues(input: {
    jql: string;
    maxResults: number;
    fields: string[];
  }): Promise<JiraSearchResponse> {
    return this.jiraRequest<JiraSearchResponse>("/rest/api/3/search/jql", {
      method: "POST",
      body: JSON.stringify({
        jql: input.jql,
        maxResults: input.maxResults,
        fields: input.fields
      })
    });
  }

  async createIssue(input: {
    projectKey: string;
    issueType: string;
    summary: string;
    description?: string;
    labels?: string[];
    assigneeAccountId?: string;
    parentIssueKey?: string;
    fields?: Record<string, unknown>;
  }): Promise<JiraCreateIssueResponse> {
    const fields: Record<string, unknown> = {
      project: { key: input.projectKey },
      issuetype: { name: input.issueType },
      summary: input.summary,
      ...input.fields
    };

    if (input.description) {
      fields.description = textToAdf(input.description);
    }

    if (input.labels?.length) {
      fields.labels = input.labels;
    }

    if (input.assigneeAccountId) {
      fields.assignee = { accountId: input.assigneeAccountId };
    }

    if (input.parentIssueKey) {
      fields.parent = { key: input.parentIssueKey };
    }

    return this.jiraRequest<JiraCreateIssueResponse>("/rest/api/3/issue", {
      method: "POST",
      body: JSON.stringify({ fields })
    });
  }

  async createProject(input: {
    key: string;
    name: string;
    projectTypeKey: string;
    projectTemplateKey: string;
    description?: string;
    url?: string;
    leadAccountId?: string;
    assigneeType?: "PROJECT_LEAD" | "UNASSIGNED";
  }): Promise<JiraProjectResponse> {
    const body: Record<string, unknown> = {
      key: input.key,
      name: input.name,
      projectTypeKey: input.projectTypeKey,
      projectTemplateKey: input.projectTemplateKey
    };

    if (input.description) {
      body.description = input.description;
    }

    if (input.url) {
      body.url = input.url;
    }

    if (input.leadAccountId) {
      body.leadAccountId = input.leadAccountId;
    }

    if (input.assigneeType) {
      body.assigneeType = input.assigneeType;
    }

    return this.jiraRequest<JiraProjectResponse>("/rest/api/3/project", {
      method: "POST",
      body: JSON.stringify(body)
    });
  }

  async updateIssue(input: {
    issueKey: string;
    fields: Record<string, unknown>;
  }): Promise<void> {
    await this.jiraRequest<void>(`/rest/api/3/issue/${input.issueKey}`, {
      method: "PUT",
      body: JSON.stringify({ fields: input.fields })
    });
  }

  async getTransitions(issueKey: string): Promise<JiraTransitionsResponse> {
    return this.jiraRequest<JiraTransitionsResponse>(
      `/rest/api/3/issue/${issueKey}/transitions`,
      { method: "GET" }
    );
  }

  async transitionIssue(input: {
    issueKey: string;
    transitionId: string;
    comment?: string;
  }): Promise<void> {
    const update = input.comment
      ? {
          comment: [
            {
              add: {
                body: textToAdf(input.comment)
              }
            }
          ]
        }
      : undefined;

    await this.jiraRequest<void>(
      `/rest/api/3/issue/${input.issueKey}/transitions`,
      {
        method: "POST",
        body: JSON.stringify({
          transition: { id: input.transitionId },
          ...(update ? { update } : {})
        })
      }
    );
  }

  async addComment(input: {
    issueKey: string;
    comment: string;
  }): Promise<JiraCommentResponse> {
    return this.jiraRequest<JiraCommentResponse>(
      `/rest/api/3/issue/${input.issueKey}/comment`,
      {
        method: "POST",
        body: JSON.stringify({
          body: textToAdf(input.comment)
        })
      }
    );
  }

  async addWorklog(input: {
    issueKey: string;
    timeSpentSeconds: number;
    comment?: string;
    started?: string;
  }): Promise<JiraWorklogResponse> {
    const body: Record<string, unknown> = {
      timeSpentSeconds: input.timeSpentSeconds
    };

    if (input.comment) {
      body.comment = textToAdf(input.comment);
    }

    if (input.started) {
      body.started = input.started;
    }

    return this.jiraRequest<JiraWorklogResponse>(
      `/rest/api/3/issue/${input.issueKey}/worklog`,
      {
        method: "POST",
        body: JSON.stringify(body)
      }
    );
  }

  async linkIssues(input: {
    typeName: string;
    inwardIssueKey: string;
    outwardIssueKey: string;
    comment?: string;
  }): Promise<void> {
    await this.jiraRequest<void>("/rest/api/3/issueLink", {
      method: "POST",
      body: JSON.stringify({
        type: { name: input.typeName },
        inwardIssue: { key: input.inwardIssueKey },
        outwardIssue: { key: input.outwardIssueKey },
        ...(input.comment
          ? {
              comment: {
                body: textToAdf(input.comment)
              }
            }
          : {})
      })
    });
  }

  async deleteIssueLink(linkId: string): Promise<void> {
    await this.jiraRequest<void>(
      `/rest/api/3/issueLink/${encodeURIComponent(linkId)}`,
      {
        method: "DELETE"
      }
    );
  }

  async searchProjectStatuses(projectId: string): Promise<JiraStatusSearchResponse> {
    return this.jiraRequest<JiraStatusSearchResponse>(
      `/rest/api/3/statuses/search?projectId=${encodeURIComponent(projectId)}&maxResults=100`,
      {
        method: "GET"
      }
    );
  }

  async createProjectStatus(input: {
    projectId: string;
    name: string;
    statusCategory: "TODO" | "IN_PROGRESS" | "DONE";
    description?: string;
  }): Promise<JiraWorkflowStatusDefinition> {
    const response = await this.jiraRequest<{ statuses?: JiraWorkflowStatusDefinition[] }>(
      "/rest/api/3/statuses",
      {
        method: "POST",
        body: JSON.stringify({
          scope: {
            type: "PROJECT",
            project: {
              id: input.projectId
            }
          },
          statuses: [
            {
              name: input.name,
              statusCategory: input.statusCategory,
              ...(input.description ? { description: input.description } : {})
            }
          ]
        })
      }
    );

    const created = response.statuses?.[0];

    if (!created) {
      throw new Error(`Jira did not return the created status for ${input.name}.`);
    }

    return created;
  }

  async searchProjectWorkflows(projectId: string): Promise<JiraWorkflowSearchResponse> {
    return this.jiraRequest<JiraWorkflowSearchResponse>(
      `/rest/api/3/workflows/search?scope=PROJECT&project=${encodeURIComponent(projectId)}`,
      {
        method: "GET"
      }
    );
  }

  async getWorkflows(input: {
    workflowIds?: string[];
    workflowNames?: string[];
    projectAndIssueTypes?: unknown[];
  }): Promise<JiraBulkWorkflowsResponse> {
    return this.jiraRequest<JiraBulkWorkflowsResponse>("/rest/api/3/workflows", {
      method: "POST",
      body: JSON.stringify({
        workflowIds: input.workflowIds ?? [],
        workflowNames: input.workflowNames ?? [],
        projectAndIssueTypes: input.projectAndIssueTypes ?? []
      })
    });
  }

  async validateWorkflowUpdate(input: {
    payload: JiraWorkflowUpdateRequest;
    validationOptions?: {
      levels?: Array<"ERROR" | "WARNING">;
    };
  }): Promise<JiraWorkflowValidationErrorList> {
    return this.jiraRequest<JiraWorkflowValidationErrorList>(
      "/rest/api/3/workflows/update/validation",
      {
        method: "POST",
        body: JSON.stringify({
          payload: input.payload,
          ...(input.validationOptions
            ? { validationOptions: input.validationOptions }
            : {})
        })
      }
    );
  }

  async updateWorkflow(
    payload: JiraWorkflowUpdateRequest
  ): Promise<JiraBulkWorkflowsResponse & { taskId?: string }> {
    return this.jiraRequest<JiraBulkWorkflowsResponse & { taskId?: string }>(
      "/rest/api/3/workflows/update",
      {
        method: "POST",
        body: JSON.stringify(payload)
      }
    );
  }

  private jiraRequest<T>(path: string, init: RequestInit): Promise<T> {
    return requestJson<T>(`${this.config.jiraBaseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: basicAuthHeader(
          this.config.jiraEmail,
          this.config.jiraApiToken
        ),
        Accept: "application/json",
        "Content-Type": "application/json"
      }
    });
  }
}
