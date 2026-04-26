import type {
  JiraApi,
  JiraCustomFieldCreateResponse,
  JiraFieldDefinition,
  JiraIssueTypeDefinition,
  JiraIssueTypeFieldDefinition
} from "./jira-api.js";

export type AdminManagementModel = "team-managed" | "company-managed";

export type IssueTypeCapability = {
  requestedName: string;
  matchedIssueType?: JiraIssueTypeDefinition;
  available: boolean;
  native: boolean;
  canCreateViaTooling: boolean;
  canAssignToProjectViaTooling: boolean;
  fallbackType: string;
  fallbackLabels: string[];
  manualStepRequired: boolean;
  notes: string[];
};

export type FieldCapability = {
  fieldName: string;
  fieldKey?: string;
  available: boolean;
  required: boolean;
  requiredForIssueTypes: string[];
  canCreateViaTooling: boolean;
  canEnforceViaTooling: boolean;
  fallbackStrategy: "existing-field" | "custom-field" | "description-comment";
  matchedField?: JiraFieldDefinition | JiraIssueTypeFieldDefinition;
  manualStepRequired: boolean;
  notes: string[];
};

export type ProjectAdminDiscovery = {
  project: {
    id?: string;
    key?: string;
    name?: string;
    simplified?: boolean;
    style?: string;
    projectTypeKey?: string;
  };
  managementModel: AdminManagementModel;
  availableIssueTypes: JiraIssueTypeDefinition[];
  notes: string[];
};

const VALIDATION_ISSUE_TYPE_NAMES = ["Validation", "Test"];
const BUG_ISSUE_TYPE_NAMES = ["Bug"];

export class AdminCapabilityService {
  constructor(private readonly jiraApi: JiraApi) {}

  async discoverProject(projectKey: string): Promise<ProjectAdminDiscovery> {
    const project = await this.jiraApi.getProject(projectKey);
    const issueTypes =
      project.issueTypes?.length
        ? (project.issueTypes as JiraIssueTypeDefinition[])
        : (await this.jiraApi.getProjectIssueTypes(projectKey)).issueTypes ?? [];
    const managementModel: AdminManagementModel =
      project.simplified === true ? "team-managed" : "company-managed";
    const notes: string[] = [];

    if (managementModel === "team-managed") {
      notes.push(
        "This project appears to be team-managed or simplified, so issue type and field policy APIs may be limited."
      );
    }

    if (issueTypes.length === 0) {
      notes.push(
        "No project issue types were returned from the accessible APIs. Manual Jira inspection may be required."
      );
    }

    return {
      project: {
        ...(project.id ? { id: project.id } : {}),
        ...(project.key ? { key: project.key } : {}),
        ...(project.name ? { name: project.name } : {}),
        ...(project.simplified !== undefined
          ? { simplified: project.simplified }
          : {}),
        ...(project.style ? { style: project.style } : {}),
        ...(project.projectTypeKey
          ? { projectTypeKey: project.projectTypeKey }
          : {})
      },
      managementModel,
      availableIssueTypes: issueTypes,
      notes
    };
  }

  async discoverIssueTypeCapabilities(
    projectKey: string
  ): Promise<ProjectAdminDiscovery & {
    commonIssueTypes: Record<string, IssueTypeCapability>;
  }> {
    const discovery = await this.discoverProject(projectKey);

    return {
      ...discovery,
      commonIssueTypes: {
        Bug: this.buildIssueTypeCapability(discovery, "Bug", BUG_ISSUE_TYPE_NAMES),
        Task: this.buildIssueTypeCapability(discovery, "Task", ["Task"]),
        Story: this.buildIssueTypeCapability(discovery, "Story", ["Story"]),
        Validation: this.buildIssueTypeCapability(
          discovery,
          "Validation",
          VALIDATION_ISSUE_TYPE_NAMES
        )
      }
    };
  }

  async planIssueTypeEnablement(
    projectKey: string,
    requestedIssueTypes: string[]
  ): Promise<ProjectAdminDiscovery & { capabilities: IssueTypeCapability[] }> {
    const discovery = await this.discoverProject(projectKey);

    return {
      ...discovery,
      capabilities: requestedIssueTypes.map((requestedName) =>
        this.buildIssueTypeCapability(discovery, requestedName)
      )
    };
  }

  async ensureIssueTypeAvailable(input: {
    projectKey: string;
    issueTypeName: string;
    description?: string;
    type?: "standard" | "subtask";
    hierarchyLevel?: number;
  }): Promise<
    ProjectAdminDiscovery & {
      capability: IssueTypeCapability;
      createdIssueType?: JiraIssueTypeDefinition;
      manualStepRequired: boolean;
    }
  > {
    const discovery = await this.discoverProject(input.projectKey);
    const capability = this.buildIssueTypeCapability(
      discovery,
      input.issueTypeName
    );

    if (capability.available) {
      return {
        ...discovery,
        capability,
        manualStepRequired: capability.manualStepRequired
      };
    }

    const createdIssueType = await this.jiraApi.createIssueType({
      name: input.issueTypeName,
      ...(input.description ? { description: input.description } : {}),
      ...(input.type ? { type: input.type } : {}),
      ...(input.hierarchyLevel !== undefined
        ? { hierarchyLevel: input.hierarchyLevel }
        : {})
    });
    const refreshed = await this.discoverProject(input.projectKey);
    const refreshedCapability = this.buildIssueTypeCapability(
      refreshed,
      input.issueTypeName
    );
    const manualStepRequired = !refreshedCapability.available;

    if (manualStepRequired) {
      refreshedCapability.notes.push(
        "The issue type was created via the Jira API, but project-level availability could not be verified. A manual Jira admin step may still be required."
      );
    }

    return {
      ...refreshed,
      capability: refreshedCapability,
      createdIssueType,
      manualStepRequired
    };
  }

  async planFieldPolicy(input: {
    projectKey: string;
    issueTypeName: string;
    requiredFields: string[];
    fieldDefinitions?: Array<{
      fieldName: string;
      type?: string;
      searcherKey?: string;
      description?: string;
    }>;
  }): Promise<
    ProjectAdminDiscovery & {
      issueTypeCapability: IssueTypeCapability;
      fields: FieldCapability[];
      notes: string[];
    }
  > {
    const discovery = await this.discoverProject(input.projectKey);
    const issueTypeCapability = this.buildIssueTypeCapability(
      discovery,
      input.issueTypeName
    );
    const notes = [...discovery.notes];

    if (!issueTypeCapability.matchedIssueType?.id) {
      return {
        ...discovery,
        issueTypeCapability,
        fields: input.requiredFields.map((fieldName) => ({
          fieldName,
          available: false,
          required: false,
          requiredForIssueTypes: [input.issueTypeName],
          canCreateViaTooling: Boolean(
            input.fieldDefinitions?.some((item) =>
              equalsNormalized(item.fieldName, fieldName)
            )
          ),
          canEnforceViaTooling: false,
          fallbackStrategy: "description-comment",
          manualStepRequired: true,
          notes: [
            `Issue type '${input.issueTypeName}' is not currently available in project ${input.projectKey}.`
          ]
        })),
        notes
      };
    }

    const [createMeta, fieldSearch] = await Promise.all([
      this.jiraApi.getIssueTypeCreateMeta({
        projectKey: input.projectKey,
        issueTypeId: issueTypeCapability.matchedIssueType.id,
        maxResults: 100
      }),
      this.jiraApi.searchFields({
        maxResults: 200
      })
    ]);
    const availableFields = createMeta.fields ?? [];
    const globalFields = fieldSearch.values ?? [];

    return {
      ...discovery,
      issueTypeCapability,
      fields: input.requiredFields.map((fieldName) => {
        const availableField = findFieldByName(availableFields, fieldName);
        const globalField = findFieldByName(globalFields, fieldName);
        const definedField = input.fieldDefinitions?.find((item) =>
          equalsNormalized(item.fieldName, fieldName)
        );

        if (availableField) {
          return {
            fieldName,
            ...(availableField.fieldId || availableField.key
              ? {
                  fieldKey: availableField.fieldId ?? availableField.key ?? ""
                }
              : {}),
            available: true,
            required: availableField.required === true,
            requiredForIssueTypes: [input.issueTypeName],
            canCreateViaTooling: false,
            canEnforceViaTooling: availableField.required === true,
            fallbackStrategy: "existing-field",
            matchedField: availableField,
            manualStepRequired: availableField.required !== true,
            notes:
              availableField.required === true
                ? []
                : [
                    "The field is available, but required-field enforcement is not automated by the current tooling."
                  ]
          };
        }

        if (globalField) {
          return {
            fieldName,
            ...(globalField.id || globalField.key
              ? { fieldKey: globalField.id ?? globalField.key ?? "" }
              : {}),
            available: false,
            required: false,
            requiredForIssueTypes: [input.issueTypeName],
            canCreateViaTooling: false,
            canEnforceViaTooling: false,
            fallbackStrategy: "description-comment",
            matchedField: globalField,
            manualStepRequired: true,
            notes: [
              "The field exists globally, but it is not currently available on the target project/issue-type create surface."
            ]
          };
        }

        return {
          fieldName,
          available: false,
          required: false,
          requiredForIssueTypes: [input.issueTypeName],
          canCreateViaTooling: Boolean(definedField),
          canEnforceViaTooling: false,
          fallbackStrategy: definedField
            ? "custom-field"
            : "description-comment",
          manualStepRequired: !definedField,
          notes: definedField
            ? [
                "A matching field definition was supplied, so the field can be created, but project/issue-type association may still require a manual Jira admin step."
              ]
            : [
                "No matching field definition was supplied, so the safe fallback is structured description/comment content."
              ]
        };
      }),
      notes
    };
  }

  async ensureCustomFieldAvailable(input: {
    projectKey?: string;
    issueTypeName?: string;
    fieldName: string;
    description?: string;
    type?: string;
    searcherKey?: string;
  }): Promise<{
    field: JiraFieldDefinition | JiraIssueTypeFieldDefinition;
    availableOnTarget: boolean;
    manualStepRequired: boolean;
    notes: string[];
  }> {
    const existing = await this.jiraApi.searchFields({
      query: input.fieldName,
      maxResults: 50
    });
    const exactMatch = findFieldByName(existing.values ?? [], input.fieldName);

    const field =
      exactMatch ??
      normalizeFieldDefinition(
        await this.jiraApi.createCustomField({
          name: input.fieldName,
          ...resolveCustomFieldType(input.type, input.searcherKey),
          ...(input.description ? { description: input.description } : {})
        })
      );

    if (!input.projectKey || !input.issueTypeName) {
      return {
        field,
        availableOnTarget: Boolean(exactMatch),
        manualStepRequired: !exactMatch,
        notes: exactMatch
          ? []
          : [
              "The field was created globally. Project-level availability and required-field policy may still need manual Jira admin changes."
            ]
      };
    }

    const plan = await this.planFieldPolicy({
      projectKey: input.projectKey,
      issueTypeName: input.issueTypeName,
      requiredFields: [input.fieldName]
    });
    const capability = plan.fields[0];

    return {
      field,
      availableOnTarget: capability?.available === true,
      manualStepRequired: capability?.manualStepRequired ?? true,
      notes: capability?.notes ?? []
    };
  }

  private buildIssueTypeCapability(
    discovery: ProjectAdminDiscovery,
    requestedName: string,
    aliases?: string[]
  ): IssueTypeCapability {
    const candidateNames = dedupeNames([requestedName, ...(aliases ?? [])]);
    const matchedIssueType = discovery.availableIssueTypes.find((issueType) =>
      candidateNames.some((candidate) =>
        equalsNormalized(issueType.name, candidate)
      )
    );
    const fallback = buildIssueTypeFallback(requestedName);
    const native = Boolean(matchedIssueType);

    return {
      requestedName,
      ...(matchedIssueType ? { matchedIssueType } : {}),
      available: native,
      native,
      canCreateViaTooling: true,
      canAssignToProjectViaTooling: false,
      fallbackType: fallback.type,
      fallbackLabels: fallback.labels,
      manualStepRequired: !native,
      notes: native
        ? []
        : [
            "The requested issue type is not currently available in this project.",
            "The current tooling can create an issue type globally, but project-level assignment may still require a manual Jira admin step."
          ]
    };
  }
}

function normalizeFieldDefinition(
  field:
    | JiraFieldDefinition
    | JiraIssueTypeFieldDefinition
    | JiraCustomFieldCreateResponse
): JiraFieldDefinition | JiraIssueTypeFieldDefinition {
  if ("required" in field || "fieldId" in field) {
    return field;
  }

  return {
    ...("id" in field && field.id ? { id: field.id } : {}),
    ...("key" in field && field.key ? { key: field.key } : {}),
    ...(field.name ? { name: field.name } : {}),
    ...("description" in field && field.description
      ? { description: field.description }
      : {}),
    ...("typeDisplayName" in field && field.typeDisplayName
      ? { typeDisplayName: field.typeDisplayName }
      : {}),
    ...(field.schema ? { schema: field.schema } : {})
  };
}

function buildIssueTypeFallback(requestedName: string): {
  type: string;
  labels: string[];
} {
  const normalized = normalize(requestedName);

  if (normalized.includes("bug")) {
    return {
      type: "Task",
      labels: ["bug", "quality"]
    };
  }

  if (normalized.includes("validation") || normalized.includes("test")) {
    return {
      type: "Task",
      labels: ["quality-validation"]
    };
  }

  return {
    type: "Task",
    labels: [normalized.replace(/\s+/g, "-")]
  };
}

function resolveCustomFieldType(
  type: string | undefined,
  searcherKey: string | undefined
): { type: string; searcherKey: string } {
  if (type && searcherKey) {
    return { type, searcherKey };
  }

  switch (normalize(type)) {
    case "date":
      return {
        type: "com.atlassian.jira.plugin.system.customfieldtypes:datepicker",
        searcherKey:
          searcherKey ??
          "com.atlassian.jira.plugin.system.customfieldtypes:daterange"
      };
    case "datetime":
      return {
        type: "com.atlassian.jira.plugin.system.customfieldtypes:datetime",
        searcherKey:
          searcherKey ??
          "com.atlassian.jira.plugin.system.customfieldtypes:datetimerange"
      };
    case "text":
      return {
        type: "com.atlassian.jira.plugin.system.customfieldtypes:textfield",
        searcherKey:
          searcherKey ??
          "com.atlassian.jira.plugin.system.customfieldtypes:textsearcher"
      };
    case "textarea":
    default:
      return {
        type: type ?? "com.atlassian.jira.plugin.system.customfieldtypes:textarea",
        searcherKey:
          searcherKey ??
          "com.atlassian.jira.plugin.system.customfieldtypes:textsearcher"
      };
  }
}

function findFieldByName<T extends { name?: string; key?: string; fieldId?: string }>(
  fields: T[],
  fieldName: string
): T | undefined {
  return fields.find(
    (field) =>
      equalsNormalized(field.name, fieldName) ||
      equalsNormalized(field.key, fieldName) ||
      equalsNormalized(field.fieldId, fieldName)
  );
}

function dedupeNames(values: string[]): string[] {
  const unique = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const normalized = normalize(value);

    if (!normalized || unique.has(normalized)) {
      continue;
    }

    unique.add(normalized);
    result.push(value);
  }

  return result;
}

function equalsNormalized(left?: string, right?: string): boolean {
  return normalize(left) === normalize(right);
}

function normalize(value?: string): string {
  return (value ?? "").trim().toLowerCase();
}
