import "./bootstrap/load-env.js";

import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { loadConfig } from "./config.js";
import { buildIssueDescriptionWithExecutionMetadata } from "./domain/issue-execution-metadata.js";
import { JiraApi } from "./services/jira-api.js";

type IssueType = "Epic" | "Story" | "Task" | "Bug" | "Feature" | "Request";

type CapabilityBlueprint = {
  id: string;
  issueType: IssueType;
  summary: string;
  description: string;
  parentId?: string;
  labels?: string[];
  executionMetadata?: {
    requiredSkills?: string[];
    optionalSkills?: string[];
    executionMode?: string;
    notes?: string[];
  };
};

type DependencyBlueprint = {
  blocks: string;
  blockedBy: string;
};

type ExistingIssue = {
  key?: string;
  fields?: {
    summary?: string;
    issuelinks?: Array<{
      type?: {
        name?: string;
      };
      inwardIssue?: { key?: string };
      outwardIssue?: { key?: string };
    }>;
  };
};

type StepResult = {
  step: string;
  ok: boolean;
  details: Record<string, unknown>;
};

const LABELS = ["codex-managed", "sample-roadmap", "capability-seed"];

const BLUEPRINTS: CapabilityBlueprint[] = [
  {
    id: "epic-workflow",
    issueType: "Epic",
    summary: "Adaptive workflow governance",
    description: [
      "Goal: ensure the assistant works from discovered workflow behavior instead of hardcoded lifecycle assumptions.",
      "",
      "Expected outcome:",
      "- workflow discovery and status semantics",
      "- readiness and completion policy",
      "- migration-safe workflow updates"
    ].join("\n"),
    labels: ["workflow", "governance"],
    executionMetadata: {
      requiredSkills: ["jira-core", "jira-workflow-admin"],
      optionalSkills: ["jira-execution-loop"],
      executionMode: "implement"
    }
  },
  {
    id: "story-workflow-discovery",
    issueType: "Story",
    parentId: "epic-workflow",
    summary: "Map workflow status semantics and transitions",
    description: [
      "Capture the project lifecycle in a structured way so execution can adapt to the actual workflow.",
      "",
      "Acceptance criteria:",
      "- statuses are mapped to business meaning",
      "- sampled transitions are available for execution policy",
      "- workflow discovery remains tenant-aware"
    ].join("\n"),
    labels: ["workflow", "discovery"],
    executionMetadata: {
      requiredSkills: ["jira-core", "jira-workflow-admin"],
      executionMode: "implement"
    }
  },
  {
    id: "story-readiness-policy",
    issueType: "Story",
    parentId: "epic-workflow",
    summary: "Add Definition of Ready and Definition of Done policy",
    description: [
      "Workflow alone is not enough. The assistant also needs explicit readiness and completion policy.",
      "",
      "Acceptance criteria:",
      "- readiness rules are modeled separately from workflow states",
      "- completion rules are explicit for stories, tasks, and bugs",
      "- lifecycle actions consult the policy before writing"
    ].join("\n"),
    labels: ["workflow", "readiness"],
    executionMetadata: {
      requiredSkills: ["jira-core", "jira-workflow-admin", "jira-execution-loop"],
      optionalSkills: ["jira-intake-refinement"],
      executionMode: "implement"
    }
  },
  {
    id: "epic-quality",
    issueType: "Epic",
    summary: "Quality control and bug evidence",
    description: [
      "Goal: acceptance criteria should drive explicit validation, bug handling, and evidence capture.",
      "",
      "Expected outcome:",
      "- test work linked to delivery items",
      "- bug creation when validation fails",
      "- retest and status-correction loop"
    ].join("\n"),
    labels: ["quality", "testing"],
    executionMetadata: {
      requiredSkills: ["jira-core", "jira-intake-refinement", "jira-execution-loop"],
      executionMode: "implement"
    }
  },
  {
    id: "story-test-generation",
    issueType: "Story",
    parentId: "epic-quality",
    summary: "Generate validation work from acceptance criteria",
    description: [
      "Stories and tasks should gain explicit validation work so acceptance criteria become testable.",
      "",
      "Acceptance criteria:",
      "- validation items can be derived from acceptance criteria",
      "- validation work stays linked to the parent item",
      "- validation requirements are not lost in free-form comments"
    ].join("\n"),
    labels: ["quality", "tests"],
    executionMetadata: {
      requiredSkills: ["jira-core", "jira-intake-refinement"],
      optionalSkills: ["jira-execution-loop"],
      executionMode: "implement"
    }
  },
  {
    id: "story-bug-evidence",
    issueType: "Story",
    parentId: "epic-quality",
    summary: "Create bugs with evidence and linked parent impact",
    description: [
      "When validation fails, the assistant should create a bug, link it back to the parent work item, and preserve evidence.",
      "",
      "Acceptance criteria:",
      "- failed validation creates a bug item",
      "- the bug links back to the affected parent",
      "- evidence is stored in a structured way"
    ].join("\n"),
    labels: ["quality", "bug"],
    executionMetadata: {
      requiredSkills: ["jira-core", "jira-execution-loop"],
      optionalSkills: ["jira-intake-refinement"],
      executionMode: "implement"
    }
  },
  {
    id: "epic-dependency",
    issueType: "Epic",
    summary: "Dependency-aware delivery control",
    description: [
      "Goal: let the assistant understand blockers and sequencing instead of only creating issue links.",
      "",
      "Expected outcome:",
      "- dependency snapshots on important issues",
      "- dependency-aware next-issue selection",
      "- dependency maintenance when scope changes"
    ].join("\n"),
    labels: ["dependency", "execution"],
    executionMetadata: {
      requiredSkills: ["jira-core", "jira-execution-loop"],
      optionalSkills: ["jira-intake-refinement"],
      executionMode: "implement"
    }
  },
  {
    id: "story-dependency-model",
    issueType: "Story",
    parentId: "epic-dependency",
    summary: "Normalize dependency snapshots from Jira links",
    description: [
      "Build a consistent dependency view from Jira issue links so blockers become reliable execution inputs.",
      "",
      "Acceptance criteria:",
      "- `blocked by` and `blocks` directions are separated",
      "- issue reads return a dependency snapshot",
      "- open blockers are visible without manual inspection"
    ].join("\n"),
    labels: ["dependency", "model"],
    executionMetadata: {
      requiredSkills: ["jira-core", "jira-execution-loop"],
      optionalSkills: ["jira-intake-refinement"],
      executionMode: "implement"
    }
  },
  {
    id: "story-dependency-selection",
    issueType: "Story",
    parentId: "epic-dependency",
    summary: "Explain next-issue selection using dependency state",
    description: [
      "Next-issue selection should return both eligible work and the reason blocked work was skipped.",
      "",
      "Acceptance criteria:",
      "- blocked candidates and blocker keys are surfaced",
      "- selection reasoning references dependency state",
      "- blocked work cannot start silently"
    ].join("\n"),
    labels: ["dependency", "selection"],
    executionMetadata: {
      requiredSkills: ["jira-core", "jira-execution-loop"],
      optionalSkills: ["jira-intake-refinement"],
      executionMode: "implement"
    }
  },
  {
    id: "epic-change",
    issueType: "Epic",
    summary: "Change request control and scope evolution",
    description: [
      "Goal: handle scope changes explicitly instead of hiding them inside ticket comments.",
      "",
      "Expected outcome:",
      "- classify incoming changes",
      "- estimate impact on existing work",
      "- reopen, modify, create, or relink items safely"
    ].join("\n"),
    labels: ["change", "scope"],
    executionMetadata: {
      requiredSkills: ["jira-core", "jira-intake-refinement", "jira-project-bootstrap"],
      optionalSkills: ["jira-workflow-admin"],
      executionMode: "implement"
    }
  },
  {
    id: "story-change-classify",
    issueType: "Story",
    parentId: "epic-change",
    summary: "Classify incoming scope changes",
    description: [
      "The assistant should distinguish between new scope, bug work, reopen requests, and modifications to existing intent.",
      "",
      "Acceptance criteria:",
      "- incoming changes are classified into explicit categories",
      "- classification considers context, not just issue type",
      "- ambiguous cases produce an explicit decision point"
    ].join("\n"),
    labels: ["change", "classification"],
    executionMetadata: {
      requiredSkills: ["jira-core", "jira-intake-refinement"],
      optionalSkills: ["jira-project-bootstrap"],
      executionMode: "implement"
    }
  },
  {
    id: "story-change-impact",
    issueType: "Story",
    parentId: "epic-change",
    summary: "Estimate impact on dependencies and release order",
    description: [
      "Every significant change should assess which issues, dependencies, priorities, or release sequence are affected.",
      "",
      "Acceptance criteria:",
      "- impacted issues and dependencies are listed",
      "- reopen or split recommendations are explicit",
      "- release risk is documented"
    ].join("\n"),
    labels: ["change", "impact"],
    executionMetadata: {
      requiredSkills: ["jira-core", "jira-intake-refinement", "jira-execution-loop"],
      optionalSkills: ["jira-workflow-admin"],
      executionMode: "implement"
    }
  }
];

const DEPENDENCIES: DependencyBlueprint[] = [
  { blocks: "story-workflow-discovery", blockedBy: "story-readiness-policy" },
  { blocks: "story-test-generation", blockedBy: "story-bug-evidence" },
  { blocks: "story-dependency-model", blockedBy: "story-dependency-selection" },
  { blocks: "story-change-classify", blockedBy: "story-change-impact" }
];

async function main(): Promise<void> {
  requireLiveConfirmation();

  const config = loadConfig();
  const jiraApi = new JiraApi(config);
  const projectKey =
    config.validationProjectKey ?? config.defaultProjectKey ?? undefined;

  if (!projectKey) {
    throw new Error(
      "Missing JIRA_DEFAULT_PROJECT_KEY or JIRA_VALIDATION_PROJECT_KEY. Refusing to seed the sample roadmap without an explicit target project."
    );
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const results: StepResult[] = [];

  const existingIssues = await jiraApi.searchIssues({
    jql: `project = ${projectKey} AND labels = "${LABELS[1]}" ORDER BY created ASC`,
    maxResults: 100,
    fields: ["summary", "issuelinks"]
  });
  const bySummary = new Map(
    (existingIssues.issues as ExistingIssue[]).map((issue) => [
      issue.fields?.summary ?? "",
      issue
    ])
  );

  const issueKeysById: Record<string, string> = {};
  const created: string[] = [];
  const reused: string[] = [];

  for (const blueprint of BLUEPRINTS) {
    const existing = bySummary.get(qualifiedSummary(blueprint.summary));

    if (existing?.key) {
      issueKeysById[blueprint.id] = existing.key;
      reused.push(existing.key);
      continue;
    }

    const payload: {
      projectKey: string;
      issueType: IssueType;
      summary: string;
      description?: string;
      labels: string[];
      parentIssueKey?: string;
    } = {
      projectKey,
      issueType: blueprint.issueType,
      summary: qualifiedSummary(blueprint.summary),
      labels: [...LABELS, ...(blueprint.labels ?? [])]
    };

    const description = buildIssueDescriptionWithExecutionMetadata(
      blueprint.description,
      blueprint.executionMetadata
    );

    if (description) {
      payload.description = description;
    }

    if (blueprint.parentId) {
      const parentIssueKey = issueKeysById[blueprint.parentId];

      if (parentIssueKey) {
        payload.parentIssueKey = parentIssueKey;
      }
    }

    const issue = await jiraApi.createIssue(payload);
    issueKeysById[blueprint.id] = issue.key;
    created.push(issue.key);
  }

  for (const dependency of DEPENDENCIES) {
    const sourceKey = issueKeysById[dependency.blocks];
    const targetKey = issueKeysById[dependency.blockedBy];

    if (!sourceKey || !targetKey) {
      continue;
    }

    if (await hasBlocksLink(jiraApi, sourceKey, targetKey)) {
      continue;
    }

    await jiraApi.linkIssues({
      typeName: "Blocks",
      inwardIssueKey: sourceKey,
      outwardIssueKey: targetKey,
      comment: "Seeded by the sample capability roadmap flow."
    });
  }

  results.push({
    step: "seed capability roadmap",
    ok: true,
    details: {
      projectKey,
      createdCount: created.length,
      reusedCount: reused.length,
      created,
      reused
    }
  });

  const reportPath = resolve(
    process.cwd(),
    "artifacts",
    `sample-roadmap-seed-${timestamp}.json`
  );

  await mkdir(resolve(process.cwd(), "artifacts"), { recursive: true });
  await writeFile(
    reportPath,
    JSON.stringify(
      {
        ranAt: new Date().toISOString(),
        projectKey,
        issueKeysById,
        created,
        reused,
        results
      },
      null,
      2
    ),
    "utf8"
  );

  console.log(`Sample roadmap seed OK. Report written to ${reportPath}`);
  console.log(`Created: ${created.join(", ") || "none"}`);
  console.log(`Reused: ${reused.join(", ") || "none"}`);
}

function qualifiedSummary(summary: string): string {
  return `[Sample Capability] ${summary}`;
}

async function hasBlocksLink(
  jiraApi: JiraApi,
  sourceIssueKey: string,
  targetIssueKey: string
): Promise<boolean> {
  const issue = (await jiraApi.getIssue(sourceIssueKey, [
    "summary",
    "issuelinks"
  ])) as ExistingIssue;
  const links = issue.fields?.issuelinks ?? [];

  return links.some((link) => {
    const target = link.outwardIssue?.key ?? link.inwardIssue?.key;
    return link.type?.name === "Blocks" && target === targetIssueKey;
  });
}

function requireLiveConfirmation(): void {
  if (!process.argv.includes("--confirm-live")) {
    throw new Error(
      "Refusing to run live Jira writes without the --confirm-live flag."
    );
  }
}

main().catch((error) => {
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(String(error));
  }

  process.exitCode = 1;
});
