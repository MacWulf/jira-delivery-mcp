import type { ProjectDocType } from "../domain/confluence-documents.js";

export type GovernanceSensitivity = "internal" | "restricted" | "sensitive";

export type GovernanceCapabilityStatus =
  | "supported_as_policy_only"
  | "manual_step_required";

export type DocMetadataPolicy = {
  docType: ProjectDocType;
  requiredLabels: string[];
  requiredBodyMarkers: string[];
  preferredTitlePrefix: string;
  currentFallbackRepresentation: string[];
  manualAdminSteps: string[];
  recommendedStructuredFields: string[];
};

export function getDocMetadataPolicy(docType: ProjectDocType): DocMetadataPolicy {
  if (docType === "kickoff-summary") {
    return {
      docType,
      requiredLabels: ["repo-first", "project-doc", "doc-kickoff-summary"],
      requiredBodyMarkers: [
        "Review needed:",
        "Source of truth:",
        "Source References"
      ],
      preferredTitlePrefix: "Kickoff Summary",
      currentFallbackRepresentation: [
        "Confluence labels",
        "Storage-format body sections",
        "Repo and Jira references rendered in the page body"
      ],
      manualAdminSteps: [
        "If native Confluence templates are required, create or update the template manually in the target space.",
        "If content status must be enforced, configure the target space status policy manually."
      ],
      recommendedStructuredFields: [
        "owner",
        "review_status",
        "source_of_truth",
        "project_key"
      ]
    };
  }

  if (docType === "project-status-update") {
    return {
      docType,
      requiredLabels: ["repo-first", "project-doc", "doc-project-status-update"],
      requiredBodyMarkers: [
        "Review needed:",
        "Source of truth:",
        "Current Status",
        "Next Steps",
        "Source References"
      ],
      preferredTitlePrefix: "Project Status Update",
      currentFallbackRepresentation: [
        "Confluence labels",
        "Storage-format body sections",
        "Repo and Jira references rendered in the page body"
      ],
      manualAdminSteps: [
        "If a governed project-status template is required, maintain it manually in Confluence until template automation exists.",
        "If status review workflow must be enforced in Confluence, configure it manually at the space level."
      ],
      recommendedStructuredFields: [
        "owner",
        "review_status",
        "updated_from_issue",
        "project_key"
      ]
    };
  }

  return {
    docType,
    requiredLabels: ["repo-first", "project-doc", "doc-implementation-note"],
    requiredBodyMarkers: [
      "Review needed:",
      "Source of truth:",
      "Change Summary",
      "Technical Notes",
      "Source References"
    ],
    preferredTitlePrefix: "Implementation Note",
    currentFallbackRepresentation: [
      "Confluence labels",
      "Storage-format body sections",
      "Repo and Jira references rendered in the page body"
    ],
    manualAdminSteps: [
      "If implementation notes need governed templates or approval status, configure those features manually in the target space.",
      "If page restrictions are required for sensitive engineering notes, set them manually per page or space."
    ],
    recommendedStructuredFields: [
      "owner",
      "review_status",
      "source_issue_key",
      "source_of_truth"
    ]
  };
}

export function getSensitivityGuidance(
  sensitivity: GovernanceSensitivity
): {
  restrictionStatus: GovernanceCapabilityStatus;
  notes: string[];
  manualAdminSteps: string[];
} {
  if (sensitivity === "sensitive") {
    return {
      restrictionStatus: "manual_step_required",
      notes: [
        "Sensitive Confluence content should not rely on publish-only automation for access control.",
        "Restriction behavior must be validated manually in the target space."
      ],
      manualAdminSteps: [
        "Apply page or space restrictions manually before publishing sensitive content.",
        "Review the target Confluence permissions and audit settings with a site or space admin."
      ]
    };
  }

  if (sensitivity === "restricted") {
    return {
      restrictionStatus: "manual_step_required",
      notes: [
        "Restricted content may need explicit page restrictions depending on the target audience.",
        "The current toolset can only plan this, not enforce it."
      ],
      manualAdminSteps: [
        "Decide whether the page requires manual restrictions before broader publication.",
        "Confirm the target space permissions match the intended audience."
      ]
    };
  }

  return {
    restrictionStatus: "supported_as_policy_only",
    notes: [
      "Internal content can follow the publish-first contract without extra restriction automation."
    ],
    manualAdminSteps: [
      "No mandatory Confluence restriction step is required unless the content scope changes."
    ]
  };
}

export function estimateStaleThresholdDays(docType?: ProjectDocType): number {
  if (docType === "project-status-update") {
    return 30;
  }

  if (docType === "implementation-note") {
    return 90;
  }

  return 120;
}

export function recommendedIndexPageTitles(docTypes: ProjectDocType[]): string[] {
  const titles = new Set<string>();

  for (const docType of docTypes) {
    if (docType === "kickoff-summary") {
      titles.add("Project Kickoff Index");
    } else if (docType === "project-status-update") {
      titles.add("Project Status Index");
    } else if (docType === "implementation-note") {
      titles.add("Implementation Notes Index");
    }
  }

  titles.add("Repo-First Project Docs Index");
  return Array.from(titles);
}
