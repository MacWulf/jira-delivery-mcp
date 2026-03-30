import "./bootstrap/load-env.js";

import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { loadConfig } from "./config.js";
import { buildIssueDescriptionWithExecutionMetadata } from "./domain/issue-execution-metadata.js";
import {
  compareIssuesByPriority,
  hasOpenBlockingDependency,
  isDoneIssue,
  type JiraIssueForSelection
} from "./policy/assistant-policy.js";
import { JiraAssistantService } from "./services/jira-assistant-service.js";
import { JiraApi } from "./services/jira-api.js";

type StepResult = {
  step: string;
  ok: boolean;
  details: Record<string, unknown>;
};

async function main(): Promise<void> {
  requireLiveConfirmation();

  const config = loadConfig();
  const jiraApi = new JiraApi(config);
  const assistantService = new JiraAssistantService(jiraApi, config);
  const projectKey = config.testProjectKey;

  if (!projectKey) {
    throw new Error(
      "Missing JIRA_TEST_PROJECT_KEY. Refusing to run demo backlog writes outside the dedicated test project."
    );
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const label = `codex-skill-demo-${timestamp.toLowerCase()}`;
  const results: StepResult[] = [];

  const epic = await jiraApi.createIssue({
    projectKey,
    issueType: "Epic",
    summary: `[Codex Demo] Skill metadata driven execution ${timestamp}`,
    description: [
      "Demo backlog for the Jira integration project.",
      "",
      "Goal:",
      "- create a small metadata-aware backlog in TEST",
      "- resolve required skills from ticket descriptions",
      "- start the first eligible issue through the assistant flow"
    ].join("\n"),
    labels: [label, "codex-demo", "skill-metadata"]
  });
  results.push({
    step: "create epic",
    ok: true,
    details: {
      issueKey: epic.key
    }
  });

  const issueDefinitions = [
    {
      id: "task-contract",
      issueType: "Task",
      summary: "Define issue execution metadata contract",
      description: [
        "Create the reusable Jira description block that can carry Codex skill routing hints.",
        "",
        "Acceptance criteria:",
        "- required and optional skills are represented in one stable block",
        "- execution mode is represented explicitly",
        "- the format is safe to roundtrip through Jira description updates"
      ].join("\n"),
      executionMetadata: {
        requiredSkills: ["jira-core", "jira-project-bootstrap"],
        optionalSkills: ["jira-intake-refinement"],
        executionMode: "implement"
      },
      dependsOn: [] as string[]
    },
    {
      id: "story-parse",
      issueType: "Task",
      summary: "Parse skill metadata from Jira descriptions",
      description: [
        "Read the metadata block back from Jira issue descriptions and resolve the referenced skills.",
        "",
        "Acceptance criteria:",
        "- required skills are parsed from the issue description",
        "- optional skills are parsed from the issue description",
        "- missing skills can be reported safely"
      ].join("\n"),
      executionMetadata: {
        requiredSkills: ["jira-core", "jira-execution-loop"],
        optionalSkills: ["jira-project-bootstrap"],
        executionMode: "implement"
      },
      dependsOn: ["task-contract"]
    },
    {
      id: "story-surface",
      issueType: "Task",
      summary: "Surface resolved skills during issue reads and selection",
      description: [
        "Return the resolved skill metadata from issue reads and next-issue selection so the operator can see what will be used.",
        "",
        "Acceptance criteria:",
        "- get_issue returns parsed execution metadata",
        "- pick_next_issue returns parsed execution metadata",
        "- the assistant plan includes required and optional skills"
      ].join("\n"),
      executionMetadata: {
        requiredSkills: ["jira-core", "jira-execution-loop"],
        optionalSkills: ["build-web-apps:frontend-skill"],
        executionMode: "implement"
      },
      dependsOn: ["story-parse"]
    },
    {
      id: "task-validate",
      issueType: "Task",
      summary: "Validate metadata roundtrip in TEST",
      description: [
        "Run a controlled roundtrip in the TEST project to prove the metadata can be created, read, updated, and used for issue start planning.",
        "",
        "Acceptance criteria:",
        "- a test issue is created with execution metadata",
        "- the metadata is read back correctly",
        "- the first eligible issue can be planned and started"
      ].join("\n"),
      executionMetadata: {
        requiredSkills: ["jira-core", "jira-execution-loop"],
        optionalSkills: ["jira-workflow-admin"],
        executionMode: "review"
      },
      dependsOn: ["story-surface"]
    }
  ];

  const issueKeysById: Record<string, string> = {};

  for (const definition of issueDefinitions) {
    const issue = await jiraApi.createIssue({
      projectKey,
      issueType: definition.issueType,
      summary: `[Codex Demo] ${definition.summary}`,
      description:
        buildIssueDescriptionWithExecutionMetadata(
          definition.description,
          definition.executionMetadata
        ) ?? definition.description,
      parentIssueKey: epic.key,
      labels: [label, "codex-demo", "skill-metadata"]
    });

    issueKeysById[definition.id] = issue.key;
    results.push({
      step: `create ${definition.id}`,
      ok: true,
      details: {
        issueKey: issue.key,
        issueType: definition.issueType
      }
    });
  }

  for (const definition of issueDefinitions) {
    const sourceKey = issueKeysById[definition.id];

    for (const blockedById of definition.dependsOn) {
      const targetKey = issueKeysById[blockedById];

      if (!sourceKey || !targetKey) {
        continue;
      }

      await jiraApi.linkIssues({
        typeName: "Blocks",
        inwardIssueKey: sourceKey,
        outwardIssueKey: targetKey,
        comment: "Codex demo dependency"
      });
    }
  }
  results.push({
    step: "link dependencies",
    ok: true,
    details: {
      dependencyCount: issueDefinitions.reduce(
        (sum, item) => sum + item.dependsOn.length,
        0
      )
    }
  });

  const search = await jiraApi.searchIssues({
    jql: `project = ${projectKey} AND labels = "${label}" AND issuetype != Epic ORDER BY created ASC`,
    maxResults: 20,
    fields: ["summary", "description", "status", "priority", "issuelinks"]
  });
  const issues = (search.issues as JiraIssueForSelection[])
    .filter((issue) => !isDoneIssue(issue))
    .filter((issue) => !hasOpenBlockingDependency(issue))
    .sort(compareIssuesByPriority);
  const nextIssue = issues[0];

  if (!nextIssue?.key) {
    throw new Error("No eligible demo issue was found after seeding.");
  }

  results.push({
    step: "pick next eligible issue",
    ok: true,
    details: {
      selected: nextIssue.key
    }
  });

  const plan = await assistantService.planStartIssueWork(nextIssue.key);
  results.push({
    step: "plan start issue work",
    ok: true,
    details: {
      issueKey: plan.issueKey,
      transitionName: plan.transitionName,
      requiredSkills: plan.requiredSkills,
      optionalSkills: plan.optionalSkills
    }
  });

  await jiraApi.transitionIssue({
    issueKey: nextIssue.key,
    transitionId: plan.transitionId,
    comment: "Codex demo: first eligible issue started automatically."
  });
  results.push({
    step: "start first issue",
    ok: true,
    details: {
      issueKey: nextIssue.key,
      transitionName: plan.transitionName
    }
  });

  const reportPath = resolve(
    process.cwd(),
    "artifacts",
    `skill-metadata-demo-live-test-${timestamp}.json`
  );

  await mkdir(resolve(process.cwd(), "artifacts"), { recursive: true });
  await writeFile(
    reportPath,
    JSON.stringify(
      {
        ranAt: new Date().toISOString(),
        projectKey,
        label,
        epicKey: epic.key,
        issueKeysById,
        startedIssueKey: nextIssue.key,
        results
      },
      null,
      2
    ),
    "utf8"
  );

  console.log(`Skill metadata demo OK. Report written to ${reportPath}`);
  console.log(`Epic: ${epic.key}`);
  console.log(`Started issue: ${nextIssue.key}`);
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
