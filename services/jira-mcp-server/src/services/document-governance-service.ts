import type { ProjectDocType } from "../domain/confluence-documents.js";
import {
  estimateStaleThresholdDays,
  getDocMetadataPolicy,
  getSensitivityGuidance,
  recommendedIndexPageTitles,
  type GovernanceSensitivity
} from "../policy/confluence-governance-policy.js";
import type { ConfluenceApi, ConfluencePage, ConfluenceSpace } from "./confluence-api.js";

type SpaceProfile = {
  space: ConfluenceSpace;
  summary: {
    totalPagesSampled: number;
    supportedDocPages: number;
    homepageId?: string;
  };
  policySignals: {
    publishingMode: "repo-first";
    templateAutomation: "manual_step_required";
    contentStatusAutomation: "manual_step_required";
    restrictionAutomation: "manual_step_required";
    analyticsAutomation: "manual_step_required";
  };
  manualAdminSteps: string[];
};

type DocGovernancePlan = {
  docType: ProjectDocType;
  spaceId: string;
  sensitivity: GovernanceSensitivity;
  templateStatus: "supported_as_policy_only" | "manual_step_required";
  contentStatus: "supported_as_policy_only" | "manual_step_required";
  restrictionStatus: "supported_as_policy_only" | "manual_step_required";
  policyNotes: string[];
  metadataPolicy: ReturnType<typeof getDocMetadataPolicy>;
  manualAdminSteps: string[];
};

type StalenessCandidate = {
  pageId: string;
  title: string;
  docType?: ProjectDocType;
  ageDays?: number;
  staleReasons: string[];
  brokenContractSignals: string[];
  suggestedAction:
    | "review"
    | "archive-candidate"
    | "metadata-fix"
    | "manual-admin-step";
  webUrl?: string;
};

type StalenessAnalysis = {
  spaceId: string;
  scannedPages: number;
  docTypeFilter?: ProjectDocType;
  thresholdDays: number;
  candidates: StalenessCandidate[];
  notes: string[];
};

type RemediationPlan = {
  spaceId: string;
  mode: "conservative" | "aggressive";
  actions: Array<{
    pageId: string;
    title: string;
    suggestedAction:
      | "review"
      | "archive-candidate"
      | "metadata-fix"
      | "manual-admin-step";
    reason: string;
    manualAdminSteps: string[];
    webUrl?: string;
  }>;
};

type MetadataPolicyPlan = {
  docType: ProjectDocType;
  spaceId?: string;
  requiredMetadataFields: string[];
  currentFallbackRepresentation: string[];
  nativeConfluenceGap: string[];
  manualAdminSteps: string[];
};

type IndexPagePlan = {
  spaceId: string;
  docTypes: ProjectDocType[];
  recommendedPages: Array<{
    title: string;
    purpose: string;
    supportingDocTypes: ProjectDocType[];
    suggestedLabels: string[];
  }>;
  reportingFallback: string[];
  manualAdminSteps: string[];
};

export class DocumentGovernanceService {
  constructor(private readonly confluenceApi: ConfluenceApi) {}

  async getDocSpaceProfile(spaceId: string): Promise<SpaceProfile> {
    const space = await this.loadSpace(spaceId);
    const pages = await this.confluenceApi.listPages({ spaceId, limit: 100 });
    const supportedDocPages = pages.filter((page) => inferDocType(page)).length;

    return {
      space,
      summary: {
        totalPagesSampled: pages.length,
        supportedDocPages,
        ...(space.homepageId ? { homepageId: space.homepageId } : {})
      },
      policySignals: {
        publishingMode: "repo-first",
        templateAutomation: "manual_step_required",
        contentStatusAutomation: "manual_step_required",
        restrictionAutomation: "manual_step_required",
        analyticsAutomation: "manual_step_required"
      },
      manualAdminSteps: [
        "Review the target space permissions and template configuration manually before enforcing broader governance.",
        "If content status workflow is required, configure it manually in Confluence until admin-safe automation exists."
      ]
    };
  }

  async planDocGovernance(input: {
    docType: ProjectDocType;
    spaceId: string;
    sensitivity?: GovernanceSensitivity;
  }): Promise<DocGovernancePlan> {
    const sensitivity = input.sensitivity ?? "internal";
    const metadataPolicy = getDocMetadataPolicy(input.docType);
    const sensitivityGuidance = getSensitivityGuidance(sensitivity);

    return {
      docType: input.docType,
      spaceId: input.spaceId,
      sensitivity,
      templateStatus: "manual_step_required",
      contentStatus: "manual_step_required",
      restrictionStatus: sensitivityGuidance.restrictionStatus,
      policyNotes: [
        "The current Confluence governance layer is planning-only and does not mutate native admin settings.",
        "Repo-first publishing remains the supported execution path."
      ],
      metadataPolicy,
      manualAdminSteps: [
        ...metadataPolicy.manualAdminSteps,
        ...sensitivityGuidance.manualAdminSteps
      ]
    };
  }

  async analyzeDocStaleness(input: {
    spaceId: string;
    pageIds?: string[];
    docType?: ProjectDocType;
  }): Promise<StalenessAnalysis> {
    const pages = await this.loadPagesForAnalysis(input.spaceId, input.pageIds);
    const thresholdDays = estimateStaleThresholdDays(input.docType);
    const candidates = pages
      .map((page) => analyzePage(page, input.docType, thresholdDays))
      .filter((candidate) => candidate.staleReasons.length > 0 || candidate.brokenContractSignals.length > 0);

    return {
      spaceId: input.spaceId,
      scannedPages: pages.length,
      ...(input.docType ? { docTypeFilter: input.docType } : {}),
      thresholdDays,
      candidates,
      notes: [
        "Staleness is heuristic and should be reviewed by a human before archive or major governance actions.",
        "Analytics API signals are not assumed here; the current layer relies on page metadata, labels, titles, and body contract checks."
      ]
    };
  }

  async planDocRemediation(input: {
    spaceId: string;
    pageIds?: string[];
    mode?: "conservative" | "aggressive";
  }): Promise<RemediationPlan> {
    const mode = input.mode ?? "conservative";
    const analysis = await this.analyzeDocStaleness({
      spaceId: input.spaceId,
      ...(input.pageIds ? { pageIds: input.pageIds } : {})
    });

    return {
      spaceId: input.spaceId,
      mode,
      actions: analysis.candidates.map((candidate) => ({
        pageId: candidate.pageId,
        title: candidate.title,
        suggestedAction:
          candidate.suggestedAction === "archive-candidate" && mode === "conservative"
            ? "review"
            : candidate.suggestedAction,
        reason:
          candidate.brokenContractSignals[0] ??
          candidate.staleReasons[0] ??
          "No explicit reason was generated.",
        manualAdminSteps: buildRemediationManualSteps(candidate),
        ...(candidate.webUrl ? { webUrl: candidate.webUrl } : {})
      }))
    };
  }

  planDocMetadataPolicy(input: {
    docType: ProjectDocType;
    spaceId?: string;
  }): MetadataPolicyPlan {
    const policy = getDocMetadataPolicy(input.docType);

    return {
      docType: input.docType,
      ...(input.spaceId ? { spaceId: input.spaceId } : {}),
      requiredMetadataFields: [
        "labels",
        "review_needed_marker",
        "source_references",
        ...policy.recommendedStructuredFields
      ],
      currentFallbackRepresentation: policy.currentFallbackRepresentation,
      nativeConfluenceGap: [
        "Native content properties and report macros are not automated in the current capability.",
        "Template and content-status administration remain manual Confluence admin work."
      ],
      manualAdminSteps: policy.manualAdminSteps
    };
  }

  planDocIndexPages(input: {
    spaceId: string;
    docTypes?: ProjectDocType[];
  }): IndexPagePlan {
    const docTypes = input.docTypes?.length
      ? Array.from(new Set(input.docTypes))
      : (["kickoff-summary", "project-status-update", "implementation-note"] as ProjectDocType[]);
    const recommendedPages = recommendedIndexPageTitles(docTypes).map((title) => ({
      title,
      purpose:
        title === "Repo-First Project Docs Index"
          ? "Top-level landing page for repo-first Confluence documentation."
          : `Focused index page for ${title.replace(" Index", "").toLowerCase()}.`,
      supportingDocTypes: title === "Repo-First Project Docs Index"
        ? docTypes
        : docTypes.filter((docType) => titleMatchesDocType(title, docType)),
      suggestedLabels: ["repo-first", "project-doc-index", sanitizeIndexLabel(title)]
    }));

    return {
      spaceId: input.spaceId,
      docTypes,
      recommendedPages,
      reportingFallback: [
        "Use deterministic labels and title prefixes to make pages discoverable without native Confluence report automation.",
        "Use repo-first body markers to identify pages that comply with the publishing contract."
      ],
      manualAdminSteps: [
        "If native Confluence report pages or content properties are required, configure them manually in the target space.",
        "Review whether the target space should expose a dedicated documentation landing page."
      ]
    };
  }

  private async loadSpace(spaceId: string): Promise<ConfluenceSpace> {
    const spaces = await this.confluenceApi.listSpaces();
    const space = spaces.find((item) => item.id === spaceId);

    if (!space) {
      throw new Error(`Could not resolve Confluence space ${spaceId}.`);
    }

    return space;
  }

  private async loadPagesForAnalysis(
    spaceId: string,
    pageIds?: string[]
  ): Promise<ConfluencePage[]> {
    if (pageIds?.length) {
      return Promise.all(pageIds.map((pageId) => this.confluenceApi.getPage(pageId, true)));
    }

    const pages = await this.confluenceApi.listPages({
      spaceId,
      limit: 100,
      includeBodyStorage: true
    });

    return Promise.all(
      pages.map((page) => this.confluenceApi.getPage(page.id, true))
    );
  }
}

function analyzePage(
  page: ConfluencePage,
  docTypeFilter: ProjectDocType | undefined,
  thresholdDays: number
): StalenessCandidate {
  const inferredDocType = inferDocType(page);
  const metadataPolicy = inferredDocType ? getDocMetadataPolicy(inferredDocType) : null;
  const ageDays = page.version?.createdAt
    ? Math.floor(
        (Date.now() - new Date(page.version.createdAt).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : undefined;
  const brokenContractSignals: string[] = [];
  const staleReasons: string[] = [];

  if (docTypeFilter && inferredDocType && inferredDocType !== docTypeFilter) {
    brokenContractSignals.push(
      `Page appears to belong to ${inferredDocType}, not the requested ${docTypeFilter}.`
    );
  }

  if (!inferredDocType) {
    brokenContractSignals.push(
      "Page does not match a supported repo-first project-doc type by title or labels."
    );
  }

  if (metadataPolicy) {
    for (const requiredLabel of metadataPolicy.requiredLabels) {
      if (!page.labels.map((label) => label.toLowerCase()).includes(requiredLabel)) {
        brokenContractSignals.push(`Missing required label ${requiredLabel}.`);
      }
    }

    const body = page.bodyStorage ?? "";
    for (const marker of metadataPolicy.requiredBodyMarkers) {
      if (!body.includes(marker)) {
        brokenContractSignals.push(`Missing body marker ${marker}.`);
      }
    }

    if (!page.title.startsWith(metadataPolicy.preferredTitlePrefix)) {
      brokenContractSignals.push(
        `Title does not follow the preferred ${metadataPolicy.preferredTitlePrefix} prefix.`
      );
    }
  }

  if (ageDays !== undefined && ageDays > thresholdDays) {
    staleReasons.push(
      `Page is ${ageDays} days old, above the ${thresholdDays}-day heuristic threshold.`
    );
  }

  const sourceReferencePresent = (page.bodyStorage ?? "").includes("Source References");
  if (!sourceReferencePresent) {
    staleReasons.push("Source References section is missing.");
  }

  const suggestedAction = pickSuggestedAction({
    staleReasons,
    brokenContractSignals,
    ...(ageDays !== undefined ? { ageDays } : {}),
    thresholdDays
  });

  return {
    pageId: page.id,
    title: page.title,
    ...(inferredDocType ? { docType: inferredDocType } : {}),
    ...(ageDays !== undefined ? { ageDays } : {}),
    staleReasons,
    brokenContractSignals,
    suggestedAction,
    ...(page.webUrl ? { webUrl: page.webUrl } : {})
  };
}

function inferDocType(page: ConfluencePage): ProjectDocType | undefined {
  const labels = page.labels.map((label) => label.toLowerCase());

  if (labels.includes("doc-kickoff-summary") || page.title.startsWith("Kickoff Summary")) {
    return "kickoff-summary";
  }

  if (
    labels.includes("doc-project-status-update") ||
    page.title.startsWith("Project Status Update")
  ) {
    return "project-status-update";
  }

  if (
    labels.includes("doc-implementation-note") ||
    page.title.startsWith("Implementation Note")
  ) {
    return "implementation-note";
  }

  return undefined;
}

function pickSuggestedAction(input: {
  staleReasons: string[];
  brokenContractSignals: string[];
  ageDays?: number;
  thresholdDays: number;
}): "review" | "archive-candidate" | "metadata-fix" | "manual-admin-step" {
  if (input.brokenContractSignals.some((signal) => signal.includes("Missing"))) {
    return "metadata-fix";
  }

  if (input.brokenContractSignals.length > 0) {
    return "review";
  }

  if (
    input.ageDays !== undefined &&
    input.ageDays > input.thresholdDays * 2 &&
    input.staleReasons.length > 0
  ) {
    return "archive-candidate";
  }

  if (input.staleReasons.length > 0) {
    return "review";
  }

  return "manual-admin-step";
}

function buildRemediationManualSteps(candidate: StalenessCandidate): string[] {
  if (candidate.suggestedAction === "metadata-fix") {
    return [
      "Update the page labels and body markers so the repo-first publishing contract is visible again.",
      "Re-run the documentation publish or review flow after the metadata fix."
    ];
  }

  if (candidate.suggestedAction === "archive-candidate") {
    return [
      "Review the page manually before archive.",
      "If the content is obsolete, archive it in Confluence through the normal manual admin flow."
    ];
  }

  if (candidate.suggestedAction === "review") {
    return [
      "Review the page content and metadata manually.",
      "Republish or update the page if the repo-first source has changed."
    ];
  }

  return [
    "No direct automation is recommended for this page.",
    "Review the target Confluence admin surface manually."
  ];
}

function titleMatchesDocType(title: string, docType: ProjectDocType): boolean {
  if (docType === "kickoff-summary") {
    return title.includes("Kickoff");
  }

  if (docType === "project-status-update") {
    return title.includes("Status");
  }

  return title.includes("Implementation");
}

function sanitizeIndexLabel(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
