import type { AppConfig } from "../config.js";
import {
  buildProjectDocTemplate,
  buildProjectDocTitle,
  type ProjectDocSourceReference,
  type ProjectDocTemplate,
  type ProjectDocType
} from "../domain/confluence-documents.js";
import type { JiraApi } from "./jira-api.js";
import {
  ConfluenceApi,
  type ConfluencePage,
  type ConfluenceSpace
} from "./confluence-api.js";

type IssueWithFields = {
  key?: string;
  fields?: {
    summary?: string;
    project?: {
      key?: string;
    };
  };
};

export type ProjectDocPagePlan = {
  docType: ProjectDocType;
  title: string;
  summary: string;
  labels: string[];
  sourceReferences: ProjectDocSourceReference[];
  spaceId: string;
  parentId?: string;
  reviewNeeded: boolean;
  bodyStoragePreview: string;
  pageIdentity: {
    spaceId: string;
    title: string;
    parentId?: string;
  };
  candidatePages: Array<{
    id: string;
    title: string;
    parentId?: string;
    version?: number;
    webUrl?: string;
  }>;
  upsertDecision: {
    action: "create" | "update" | "manual_step_required";
    notes: string[];
    targetPageId?: string;
  };
};

export type EnsureProjectDocPageResult = ProjectDocPagePlan & {
  action: "created" | "updated" | "manual_step_required";
  page?: {
    id: string;
    title: string;
    version?: number;
    webUrl?: string;
  };
};

export class DocumentPublishingService {
  constructor(
    private readonly confluenceApi: ConfluenceApi,
    private readonly jiraApi: JiraApi,
    private readonly config: AppConfig
  ) {}

  listSpaces(): Promise<ConfluenceSpace[]> {
    return this.confluenceApi.listSpaces();
  }

  async searchPages(input: {
    spaceId?: string;
    title?: string;
    labels?: string[];
  }): Promise<ConfluencePage[]> {
    const pages = await this.confluenceApi.listPages({
      ...(input.spaceId ? { spaceId: input.spaceId } : {}),
      ...(input.title ? { title: input.title } : {}),
      limit: 50
    });

    const labelFilters = normalizeLabels(input.labels ?? []);

    if (labelFilters.length === 0) {
      return input.title
        ? pages.filter((page) => page.title === input.title)
        : pages;
    }

    const enrichedPages = await Promise.all(
      pages.map(async (page) => this.confluenceApi.getPage(page.id, false))
    );

    return enrichedPages.filter((page) => {
      const currentLabels = new Set(normalizeLabels(page.labels));
      const titleMatches = input.title ? page.title === input.title : true;
      const labelsMatch = labelFilters.every((label) => currentLabels.has(label));
      return titleMatches && labelsMatch;
    });
  }

  getPage(pageId: string): Promise<ConfluencePage> {
    return this.confluenceApi.getPage(pageId, true);
  }

  updatePage(input: {
    pageId: string;
    title?: string;
    bodyStorage: string;
    version: number;
  }): Promise<ConfluencePage> {
    return this.confluenceApi.updatePage({
      pageId: input.pageId,
      title: input.title ?? "",
      bodyStorage: input.bodyStorage,
      version: input.version + 1
    });
  }

  async planProjectDocPage(input: {
    docType: ProjectDocType;
    sourceIssueKey?: string;
    sourcePaths?: string[];
    title?: string;
    spaceId?: string;
    parentId?: string;
  }): Promise<ProjectDocPagePlan> {
    const issueContext = await this.loadIssueContext(input.sourceIssueKey);
    const resolvedSpaceId =
      input.spaceId ?? this.config.confluenceDefaultSpaceId;

    if (!resolvedSpaceId) {
      throw new Error(
        "Missing Confluence space target. Provide spaceId or configure CONFLUENCE_DEFAULT_SPACE_ID."
      );
    }

    const resolvedTitle = buildProjectDocTitle({
      docType: input.docType,
      ...(input.title ? { explicitTitle: input.title } : {}),
      ...(issueContext.issueKey ? { issueKey: issueContext.issueKey } : {}),
      ...(issueContext.issueSummary
        ? { issueSummary: issueContext.issueSummary }
        : {}),
      ...(issueContext.projectKey ? { projectKey: issueContext.projectKey } : {})
    });
    const template = buildProjectDocTemplate({
      docType: input.docType,
      title: resolvedTitle,
      ...(issueContext.projectKey ? { projectKey: issueContext.projectKey } : {}),
      ...(issueContext.issueKey ? { issueKey: issueContext.issueKey } : {}),
      ...(issueContext.issueSummary
        ? { issueSummary: issueContext.issueSummary }
        : {}),
      sourcePaths: input.sourcePaths ?? [],
      repoRoot: process.cwd(),
      jiraBrowseBaseUrl: `${this.config.jiraBaseUrl}/browse`
    });
    const matchingPages = await this.findExactIdentityMatches({
      spaceId: resolvedSpaceId,
      title: resolvedTitle,
      ...(input.parentId ? { parentId: input.parentId } : {})
    });
    const upsertDecision = decideUpsertAction(matchingPages);

    return {
      docType: input.docType,
      title: template.title,
      summary: template.summary,
      labels: template.labels,
      sourceReferences: template.sourceReferences,
      spaceId: resolvedSpaceId,
      ...(input.parentId ? { parentId: input.parentId } : {}),
      reviewNeeded: template.reviewNeeded,
      bodyStoragePreview: template.bodyStorage,
      pageIdentity: {
        spaceId: resolvedSpaceId,
        title: template.title,
        ...(input.parentId ? { parentId: input.parentId } : {})
      },
      candidatePages: matchingPages.map((page) => ({
        id: page.id,
        title: page.title,
        ...(page.parentId ? { parentId: page.parentId } : {}),
        ...(page.version?.number ? { version: page.version.number } : {}),
        ...(page.webUrl ? { webUrl: page.webUrl } : {})
      })),
      upsertDecision
    };
  }

  async ensureProjectDocPage(input: {
    docType: ProjectDocType;
    sourceIssueKey?: string;
    sourcePaths?: string[];
    title?: string;
    spaceId?: string;
    parentId?: string;
  }): Promise<EnsureProjectDocPageResult> {
    const plan = await this.planProjectDocPage(input);

    if (plan.upsertDecision.action === "manual_step_required") {
      return {
        ...plan,
        action: "manual_step_required"
      };
    }

    if (plan.upsertDecision.action === "update") {
      const pageId = plan.upsertDecision.targetPageId;

      if (!pageId) {
        throw new Error("Update decision did not include a target page id.");
      }

      const currentPage = await this.confluenceApi.getPage(pageId, true);
      const updatedPage = await this.confluenceApi.updatePage({
        pageId,
        title: plan.title,
        bodyStorage: plan.bodyStoragePreview,
        version: (currentPage.version?.number ?? 0) + 1,
        ...(plan.spaceId ? { spaceId: plan.spaceId } : {}),
        ...(plan.parentId ? { parentId: plan.parentId } : {}),
        message: `Updated by repo-first ${plan.docType} publishing flow.`
      });
      await this.syncPageLabels(updatedPage.id, updatedPage.labels, plan.labels);

      const refreshedPage = await this.confluenceApi.getPage(updatedPage.id, false);

      return {
        ...plan,
        action: "updated",
        page: {
          id: refreshedPage.id,
          title: refreshedPage.title,
          ...(refreshedPage.version?.number
            ? { version: refreshedPage.version.number }
            : {}),
          ...(refreshedPage.webUrl ? { webUrl: refreshedPage.webUrl } : {})
        }
      };
    }

    const createdPage = await this.confluenceApi.createPage({
      spaceId: plan.spaceId,
      title: plan.title,
      bodyStorage: plan.bodyStoragePreview,
      ...(plan.parentId ? { parentId: plan.parentId } : {})
    });
    await this.syncPageLabels(createdPage.id, createdPage.labels, plan.labels);
    const refreshedPage = await this.confluenceApi.getPage(createdPage.id, false);

    return {
      ...plan,
      action: "created",
      page: {
        id: refreshedPage.id,
        title: refreshedPage.title,
        ...(refreshedPage.version?.number
          ? { version: refreshedPage.version.number }
          : {}),
        ...(refreshedPage.webUrl ? { webUrl: refreshedPage.webUrl } : {})
      }
    };
  }

  private async findExactIdentityMatches(input: {
    spaceId: string;
    title: string;
    parentId?: string;
  }): Promise<ConfluencePage[]> {
    const pages = await this.confluenceApi.listPages({
      spaceId: input.spaceId,
      title: input.title,
      limit: 20
    });

    return pages.filter((page) => {
      if (page.title !== input.title) {
        return false;
      }

      if (input.parentId) {
        return page.parentId === input.parentId;
      }

      return true;
    });
  }

  private async loadIssueContext(
    issueKey?: string
  ): Promise<{
    issueKey?: string;
    issueSummary?: string;
    projectKey?: string;
  }> {
    if (!issueKey) {
      return {};
    }

    const issue = (await this.jiraApi.getIssue(issueKey, [
      "summary",
      "project"
    ])) as IssueWithFields;

    return {
      issueKey,
      ...(issue.fields?.summary ? { issueSummary: issue.fields.summary } : {}),
      ...(issue.fields?.project?.key ? { projectKey: issue.fields.project.key } : {})
    };
  }

  private async syncPageLabels(
    pageId: string,
    currentLabels: string[],
    desiredLabels: string[]
  ): Promise<void> {
    const normalizedCurrent = new Set(normalizeLabels(currentLabels));
    const normalizedDesired = new Set(normalizeLabels(desiredLabels));
    const labelsToAdd = Array.from(normalizedDesired).filter(
      (label) => !normalizedCurrent.has(label)
    );
    const labelsToRemove = Array.from(normalizedCurrent).filter(
      (label) => !normalizedDesired.has(label)
    );

    for (const label of labelsToRemove) {
      await this.confluenceApi.removeLabel(pageId, label);
    }

    if (labelsToAdd.length > 0) {
      await this.confluenceApi.addLabels(pageId, labelsToAdd);
    }
  }
}

function decideUpsertAction(
  matchingPages: ConfluencePage[]
): {
  action: "create" | "update" | "manual_step_required";
  notes: string[];
  targetPageId?: string;
} {
  if (matchingPages.length === 0) {
    return {
      action: "create",
      notes: ["No exact page match exists for the requested identity."]
    };
  }

  if (matchingPages.length === 1) {
      return {
        action: "update",
        notes: ["One exact page match exists, so the publish flow can update it."],
        targetPageId: matchingPages[0]!.id
      };
  }

  return {
    action: "manual_step_required",
    notes: [
      "Multiple exact page matches exist for the requested identity.",
      "Refusing to update Confluence blindly until the duplicate pages are resolved."
    ]
  };
}

function normalizeLabels(labels: string[]): string[] {
  return Array.from(
    new Set(
      labels
        .map((label) => label.trim().toLowerCase())
        .filter(Boolean)
    )
  );
}
