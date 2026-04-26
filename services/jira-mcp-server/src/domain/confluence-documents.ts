import { existsSync } from "node:fs";
import { basename, isAbsolute, relative, resolve } from "node:path";

export type ProjectDocType =
  | "kickoff-summary"
  | "project-status-update"
  | "implementation-note";

export type ProjectDocSourceReference = {
  kind: "jira-issue" | "repo-path";
  label: string;
  value: string;
  url?: string;
  exists?: boolean;
};

export type ProjectDocTemplate = {
  docType: ProjectDocType;
  title: string;
  summary: string;
  labels: string[];
  sourceReferences: ProjectDocSourceReference[];
  bodyStorage: string;
  reviewNeeded: boolean;
};

export function buildProjectDocTemplate(input: {
  docType: ProjectDocType;
  title: string;
  projectKey?: string;
  issueKey?: string;
  issueSummary?: string;
  sourcePaths: string[];
  repoRoot: string;
  jiraBrowseBaseUrl?: string;
}): ProjectDocTemplate {
  const sourceReferences = buildSourceReferences({
    sourcePaths: input.sourcePaths,
    repoRoot: input.repoRoot,
    ...(input.issueKey ? { issueKey: input.issueKey } : {}),
    ...(input.issueSummary ? { issueSummary: input.issueSummary } : {}),
    ...(input.jiraBrowseBaseUrl
      ? { jiraBrowseBaseUrl: input.jiraBrowseBaseUrl }
      : {})
  });
  const summary = buildDocSummary({
    docType: input.docType,
    title: input.title,
    ...(input.issueKey ? { issueKey: input.issueKey } : {}),
    ...(input.issueSummary ? { issueSummary: input.issueSummary } : {}),
    ...(input.projectKey ? { projectKey: input.projectKey } : {})
  });
  const labels = buildDocLabels({
    docType: input.docType,
    ...(input.projectKey ? { projectKey: input.projectKey } : {}),
    ...(input.issueKey ? { issueKey: input.issueKey } : {})
  });

  return {
    docType: input.docType,
    title: input.title,
    summary,
    labels,
    sourceReferences,
    bodyStorage: renderProjectDocStorage({
      docType: input.docType,
      title: input.title,
      summary,
      ...(input.issueKey ? { issueKey: input.issueKey } : {}),
      ...(input.issueSummary ? { issueSummary: input.issueSummary } : {}),
      sourceReferences
    }),
    reviewNeeded: true
  };
}

export function buildProjectDocTitle(input: {
  docType: ProjectDocType;
  projectKey?: string;
  issueKey?: string;
  issueSummary?: string;
  explicitTitle?: string;
}): string {
  if (input.explicitTitle?.trim()) {
    return input.explicitTitle.trim();
  }

  const contextSummary = input.issueSummary?.trim();
  const contextProject = input.projectKey?.trim();
  const contextIssue = input.issueKey?.trim();

  if (input.docType === "kickoff-summary") {
    return contextProject
      ? `Kickoff Summary - ${contextProject}`
      : contextIssue
        ? `Kickoff Summary - ${contextIssue}`
        : "Kickoff Summary";
  }

  if (input.docType === "project-status-update") {
    if (contextProject) {
      return `Project Status Update - ${contextProject}`;
    }

    if (contextIssue) {
      return `Project Status Update - ${contextIssue}`;
    }

    return "Project Status Update";
  }

  if (contextIssue && contextSummary) {
    return `Implementation Note - ${contextIssue} - ${contextSummary}`;
  }

  if (contextIssue) {
    return `Implementation Note - ${contextIssue}`;
  }

  return "Implementation Note";
}

function buildDocSummary(input: {
  docType: ProjectDocType;
  title: string;
  projectKey?: string;
  issueKey?: string;
  issueSummary?: string;
}): string {
  if (input.docType === "kickoff-summary") {
    if (input.projectKey) {
      return `Repo-first kickoff summary for ${input.projectKey}.`;
    }

    if (input.issueKey) {
      return `Repo-first kickoff summary linked to ${input.issueKey}.`;
    }

    return `Repo-first kickoff summary for ${input.title}.`;
  }

  if (input.docType === "project-status-update") {
    if (input.projectKey) {
      return `Repo-first status update for ${input.projectKey}.`;
    }

    if (input.issueKey) {
      return `Repo-first status update linked to ${input.issueKey}.`;
    }

    return `Repo-first status update for ${input.title}.`;
  }

  if (input.issueKey && input.issueSummary) {
    return `Repo-first implementation note for ${input.issueKey}: ${input.issueSummary}.`;
  }

  if (input.issueKey) {
    return `Repo-first implementation note for ${input.issueKey}.`;
  }

  return `Repo-first implementation note for ${input.title}.`;
}

function buildDocLabels(input: {
  docType: ProjectDocType;
  projectKey?: string;
  issueKey?: string;
}): string[] {
  const rawLabels = [
    "repo-first",
    "project-doc",
    `doc-${input.docType}`,
    input.projectKey ? `project-${input.projectKey}` : "",
    input.issueKey ? `jira-${input.issueKey}` : ""
  ];

  return Array.from(
    new Set(
      rawLabels
        .map((value) => sanitizeConfluenceLabel(value))
        .filter(Boolean)
    )
  );
}

function buildSourceReferences(input: {
  issueKey?: string;
  issueSummary?: string;
  sourcePaths: string[];
  repoRoot: string;
  jiraBrowseBaseUrl?: string;
}): ProjectDocSourceReference[] {
  const refs: ProjectDocSourceReference[] = [];

  if (input.issueKey) {
    refs.push({
      kind: "jira-issue",
      label: input.issueSummary
        ? `${input.issueKey} - ${input.issueSummary}`
        : input.issueKey,
      value: input.issueKey,
      ...(input.jiraBrowseBaseUrl
        ? { url: `${input.jiraBrowseBaseUrl}/${encodeURIComponent(input.issueKey)}` }
        : {})
    });
  }

  for (const sourcePath of input.sourcePaths) {
    const normalizedPath = normalizeRepoPath(sourcePath, input.repoRoot);
    refs.push({
      kind: "repo-path",
      label: basename(normalizedPath),
      value: normalizedPath,
      exists: existsSync(resolve(input.repoRoot, normalizedPath))
    });
  }

  return refs;
}

function renderProjectDocStorage(input: {
  docType: ProjectDocType;
  title: string;
  summary: string;
  issueKey?: string;
  issueSummary?: string;
  sourceReferences: ProjectDocSourceReference[];
}): string {
  const sections = getDocSections(input.docType, input.issueKey, input.issueSummary);

  return [
    `<h1>${escapeHtml(input.title)}</h1>`,
    `<p><strong>Review needed:</strong> yes</p>`,
    `<p><strong>Source of truth:</strong> Repository-first. Confluence is a published view of repo and Jira artifacts.</p>`,
    `<h2>Summary</h2>`,
    `<p>${escapeHtml(input.summary)}</p>`,
    ...sections.map(
      (section) =>
        `<h2>${escapeHtml(section.heading)}</h2><p>${escapeHtml(section.body)}</p>`
    ),
    `<h2>Source References</h2>`,
    renderSourceReferences(input.sourceReferences)
  ].join("");
}

function getDocSections(
  docType: ProjectDocType,
  issueKey?: string,
  issueSummary?: string
): Array<{ heading: string; body: string }> {
  if (docType === "kickoff-summary") {
    return [
      {
        heading: "Objectives",
        body: issueSummary
          ? `This kickoff summary is anchored to ${issueKey ?? "the source work item"} and should describe the delivery goals in repo-first language.`
          : "Describe the delivery goals and intended first slice."
      },
      {
        heading: "Scope and Constraints",
        body:
          "Capture the boundaries, assumptions, and any delivery constraints that should remain stable throughout kickoff."
      },
      {
        heading: "Initial Workstreams",
        body:
          "Summarize the main implementation or planning tracks that the project will follow after kickoff."
      }
    ];
  }

  if (docType === "project-status-update") {
    return [
      {
        heading: "Current Status",
        body:
          "Summarize the current delivery position using repo and Jira evidence instead of ad-hoc narrative."
      },
      {
        heading: "Changes Since Last Update",
        body:
          "List the meaningful changes, completed slices, or newly discovered risks since the previous status update."
      },
      {
        heading: "Next Steps",
        body:
          "Describe the next planned delivery steps and any blockers or follow-up decisions."
      }
    ];
  }

  return [
    {
      heading: "Change Summary",
      body: issueKey
        ? `Describe what changed for ${issueKey} and why the change matters.`
        : "Describe what changed and why the change matters."
    },
    {
      heading: "Technical Notes",
      body:
        "Capture the repo-first technical details, tradeoffs, and implementation references that should remain visible later."
    },
    {
      heading: "Follow-up",
      body:
        "Document any remaining tasks, validation needs, or downstream documentation updates."
    }
  ];
}

function renderSourceReferences(
  sourceReferences: ProjectDocSourceReference[]
): string {
  if (sourceReferences.length === 0) {
    return "<p>No explicit source references were supplied.</p>";
  }

  const items = sourceReferences.map((ref) => {
    const label = escapeHtml(ref.label);
    const value = escapeHtml(ref.value);

    if (ref.url) {
      return `<li>${escapeHtml(ref.kind)}: <a href="${escapeHtml(ref.url)}">${label}</a></li>`;
    }

    if (ref.kind === "repo-path") {
      const suffix =
        ref.exists === false ? " (path not found at publish time)" : "";
      return `<li>${escapeHtml(ref.kind)}: <code>${value}</code>${escapeHtml(suffix)}</li>`;
    }

    return `<li>${escapeHtml(ref.kind)}: ${label}</li>`;
  });

  return `<ul>${items.join("")}</ul>`;
}

function normalizeRepoPath(sourcePath: string, repoRoot: string): string {
  const trimmed = sourcePath.trim();

  if (!trimmed) {
    return trimmed;
  }

  if (isAbsolute(trimmed)) {
    const relativePath = relative(repoRoot, trimmed);
    return relativePath.startsWith("..") ? trimmed : relativePath;
  }

  return trimmed;
}

function sanitizeConfluenceLabel(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
