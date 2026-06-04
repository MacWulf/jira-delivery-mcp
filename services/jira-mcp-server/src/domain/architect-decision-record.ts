export type ArchitectDecisionStatus =
  | "proposed"
  | "accepted"
  | "superseded"
  | "deprecated";

export type ArchitectDecisionConfidence = "high" | "medium" | "low";

export type ArchitectDecisionScope = "local" | "cross-module" | "system-wide";

export type ArchitectMigrationStyle = "big-bang" | "incremental";

export type ArchitectReviewMode =
  | "no-extra-review"
  | "bounded-spike"
  | "manual-human-review";

export type ArchitectAffectedIssue = {
  issueKey: string;
  relationship: string;
  impact: "direct" | "parent-context";
};

export type ArchitectRejectedAlternative = {
  option: string;
  reason: string;
};

export type ArchitectFollowUpAction = {
  summary: string;
  followUpType: string;
  primaryOwningSkill: string;
  migrationStyle?: ArchitectMigrationStyle;
  cleanupRequiredBeforeClosure?: boolean;
};

export type ArchitectLinkedPage = {
  title: string;
  url?: string;
  relationship?: string;
};

export type ArchitectDecisionRecordInput = {
  title: string;
  status: ArchitectDecisionStatus;
  context: string;
  decision: string;
  decisionReason: string;
  confidenceLevel: ArchitectDecisionConfidence;
  severityScope: ArchitectDecisionScope;
  targetQualityAttributes: string[];
  hardConstraints: string[];
  rejectedAlternatives: ArchitectRejectedAlternative[];
  affectedJiraIssues: ArchitectAffectedIssue[];
  migrationStyle: ArchitectMigrationStyle;
  cleanupObligations: string[];
  technicalDebtCreated: string[];
  followUpActions: ArchitectFollowUpAction[];
  requiredReviewMode: ArchitectReviewMode;
  linkedArchitecturePages: ArchitectLinkedPage[];
  projectKey?: string;
};

export type ArchitectDecisionRecordPage = {
  title: string;
  summary: string;
  labels: string[];
  bodyStorage: string;
};

export function buildArchitectDecisionRecordPage(
  input: ArchitectDecisionRecordInput
): ArchitectDecisionRecordPage {
  const pageTitle = buildArchitectDecisionPageTitle(input.title);
  const summary = buildArchitectDecisionSummary(input);
  const labels = buildArchitectDecisionLabels(input);
  const bodyStorage = renderArchitectDecisionBody(input, pageTitle, summary);

  return {
    title: pageTitle,
    summary,
    labels,
    bodyStorage
  };
}

export function buildArchitectDecisionPageTitle(title: string): string {
  const trimmed = title.trim();

  if (!trimmed) {
    return "ADR: Untitled decision";
  }

  return /^adr:/i.test(trimmed) ? trimmed : `ADR: ${trimmed}`;
}

function buildArchitectDecisionSummary(
  input: ArchitectDecisionRecordInput
): string {
  return `${input.status} ${input.severityScope} architecture decision. ${input.decisionReason}`.trim();
}

function buildArchitectDecisionLabels(
  input: ArchitectDecisionRecordInput
): string[] {
  const rawLabels = [
    "architecture",
    "adr",
    `adr-status-${input.status}`,
    `decision-scope-${input.severityScope}`,
    `review-${input.requiredReviewMode}`,
    `migration-${input.migrationStyle}`,
    input.projectKey ? `project-${input.projectKey}` : ""
  ];

  return Array.from(
    new Set(
      rawLabels
        .map((value) => sanitizeLabel(value))
        .filter(Boolean)
    )
  );
}

function renderArchitectDecisionBody(
  input: ArchitectDecisionRecordInput,
  pageTitle: string,
  summary: string
): string {
  return [
    `<h1>${escapeHtml(pageTitle)}</h1>`,
    `<p>${escapeHtml(summary)}</p>`,
    renderTextSection("Status", input.status),
    renderTextSection("Context", input.context),
    renderTextSection(
      "Decision",
      `${input.decision} Reason: ${input.decisionReason}`
    ),
    renderTextSection("Confidence Level", input.confidenceLevel),
    renderTextSection("Severity / Scope", input.severityScope),
    renderListSection("Target Quality Attributes", input.targetQualityAttributes),
    renderListSection("Hard Constraints", input.hardConstraints),
    renderRejectedAlternativesSection(input.rejectedAlternatives),
    renderAffectedIssuesSection(input.affectedJiraIssues),
    renderTextSection("Migration Style", input.migrationStyle),
    renderListSection("Cleanup Obligations", input.cleanupObligations),
    renderListSection("Technical Debt Created", input.technicalDebtCreated),
    renderFollowUpActionsSection(input.followUpActions),
    renderTextSection("Required Review Mode", input.requiredReviewMode),
    renderLinkedPagesSection(input.linkedArchitecturePages)
  ].join("");
}

function renderTextSection(heading: string, value: string): string {
  return `<h2>${escapeHtml(heading)}</h2><p>${escapeHtml(value)}</p>`;
}

function renderListSection(heading: string, items: string[]): string {
  if (items.length === 0) {
    return `<h2>${escapeHtml(heading)}</h2><p>None.</p>`;
  }

  return `<h2>${escapeHtml(heading)}</h2><ul>${items
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("")}</ul>`;
}

function renderRejectedAlternativesSection(
  items: ArchitectRejectedAlternative[]
): string {
  if (items.length === 0) {
    return `<h2>Rejected Alternatives</h2><p>None recorded.</p>`;
  }

  return `<h2>Rejected Alternatives</h2><ul>${items
    .map(
      (item) =>
        `<li><strong>${escapeHtml(item.option)}</strong>: ${escapeHtml(item.reason)}</li>`
    )
    .join("")}</ul>`;
}

function renderAffectedIssuesSection(items: ArchitectAffectedIssue[]): string {
  if (items.length === 0) {
    return `<h2>Affected Jira Issues</h2><p>None recorded.</p>`;
  }

  return `<h2>Affected Jira Issues</h2><ul>${items
    .map(
      (item) =>
        `<li><strong>${escapeHtml(item.issueKey)}</strong> (${escapeHtml(
          item.impact
        )}): ${escapeHtml(item.relationship)}</li>`
    )
    .join("")}</ul>`;
}

function renderFollowUpActionsSection(
  items: ArchitectFollowUpAction[]
): string {
  if (items.length === 0) {
    return `<h2>Follow-up Actions</h2><p>None.</p>`;
  }

  return `<h2>Follow-up Actions</h2><ul>${items
    .map((item) => {
      const details = [
        `type ${item.followUpType}`,
        `skill ${item.primaryOwningSkill}`,
        item.migrationStyle ? `migration ${item.migrationStyle}` : "",
        item.cleanupRequiredBeforeClosure !== undefined
          ? `cleanup before closure ${item.cleanupRequiredBeforeClosure ? "yes" : "no"}`
          : ""
      ]
        .filter(Boolean)
        .join("; ");

      return `<li><strong>${escapeHtml(item.summary)}</strong>${details ? `: ${escapeHtml(details)}` : ""}</li>`;
    })
    .join("")}</ul>`;
}

function renderLinkedPagesSection(items: ArchitectLinkedPage[]): string {
  if (items.length === 0) {
    return `<h2>Linked Architecture Pages</h2><p>None recorded.</p>`;
  }

  return `<h2>Linked Architecture Pages</h2><ul>${items
    .map((item) => {
      const title = escapeHtml(item.title);
      const relation = item.relationship
        ? ` (${escapeHtml(item.relationship)})`
        : "";

      if (item.url) {
        return `<li><a href="${escapeHtml(item.url)}">${title}</a>${relation}</li>`;
      }

      return `<li>${title}${relation}</li>`;
    })
    .join("")}</ul>`;
}

function sanitizeLabel(value: string): string {
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
