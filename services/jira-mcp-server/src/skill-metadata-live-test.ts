import "./bootstrap/load-env.js";

import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { loadConfig } from "./config.js";
import { textToAdf } from "./domain/adf.js";
import {
  buildIssueDescriptionWithExecutionMetadata,
  parseIssueExecutionMetadataFromDescription
} from "./domain/issue-execution-metadata.js";
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
      "Missing JIRA_TEST_PROJECT_KEY. Refusing to run skill metadata live test outside the dedicated test project."
    );
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const label = `codex-skill-metadata-${timestamp.toLowerCase()}`;
  const results: StepResult[] = [];

  const description = buildIssueDescriptionWithExecutionMetadata(
    "Skill metadata live test issue.",
    {
      requiredSkills: ["jira-core", "jira-execution-loop"],
      optionalSkills: ["build-web-apps:frontend-skill"],
      executionMode: "implement",
      notes: ["Created by the dedicated skill metadata live test."]
    }
  );

  const createPayload: {
    projectKey: string;
    issueType: string;
    summary: string;
    description?: string;
    labels: string[];
  } = {
    projectKey,
    issueType: "Task",
    summary: `[Codex Skill Metadata Test] ${timestamp}`,
    labels: [label, "codex-skill-metadata-test"]
  };

  if (description) {
    createPayload.description = description;
  }

  const issue = await jiraApi.createIssue(createPayload);
  results.push({
    step: "create issue with execution metadata",
    ok: true,
    details: {
      issueKey: issue.key
    }
  });

  const createdIssue = await jiraApi.getIssue(issue.key, [
    "summary",
    "description",
    "status"
  ]);
  const createdFields =
    (createdIssue.fields as Record<string, unknown> | undefined) ?? {};
  const createdParsed = parseIssueExecutionMetadataFromDescription(
    createdFields.description
  );
  results.push({
    step: "parse created issue metadata",
    ok: Boolean(createdParsed.executionMetadata),
    details: {
      source: createdParsed.executionMetadata?.source ?? null,
      requiredSkills:
        createdParsed.executionMetadata?.requiredSkills.map((item) => item.value) ??
        [],
      optionalSkills:
        createdParsed.executionMetadata?.optionalSkills.map((item) => item.value) ??
        [],
      executionMode: createdParsed.executionMetadata?.executionMode ?? null
    }
  });

  const plan = await assistantService.planStartIssueWork(issue.key);
  results.push({
    step: "assistant plan resolves execution metadata",
    ok: true,
    details: {
      transitionName: plan.transitionName,
      requiredSkills: plan.requiredSkills,
      optionalSkills: plan.optionalSkills
    }
  });

  const updatedDescription = buildIssueDescriptionWithExecutionMetadata(
    createdParsed.descriptionText,
    {
      requiredSkills: ["jira-core", "jira-project-bootstrap"],
      optionalSkills: ["jira-intake-refinement"],
      executionMode: "review",
      notes: ["Updated by the dedicated skill metadata live test."]
    }
  );

  await jiraApi.updateIssue({
    issueKey: issue.key,
    fields: {
      description: textToAdf(updatedDescription ?? "Skill metadata live test issue.")
    }
  });
  results.push({
    step: "update issue execution metadata",
    ok: true,
    details: {
      issueKey: issue.key
    }
  });

  const updatedIssue = await jiraApi.getIssue(issue.key, ["description"]);
  const updatedFields =
    (updatedIssue.fields as Record<string, unknown> | undefined) ?? {};
  const updatedParsed = parseIssueExecutionMetadataFromDescription(
    updatedFields.description
  );
  results.push({
    step: "parse updated issue metadata",
    ok: true,
    details: {
      requiredSkills:
        updatedParsed.executionMetadata?.requiredSkills.map((item) => item.value) ??
        [],
      optionalSkills:
        updatedParsed.executionMetadata?.optionalSkills.map((item) => item.value) ??
        [],
      executionMode: updatedParsed.executionMetadata?.executionMode ?? null
    }
  });

  const reportPath = resolve(
    process.cwd(),
    "artifacts",
    `skill-metadata-live-test-${timestamp}.json`
  );

  await mkdir(resolve(process.cwd(), "artifacts"), { recursive: true });
  await writeFile(
    reportPath,
    JSON.stringify(
      {
        ranAt: new Date().toISOString(),
        projectKey,
        label,
        issueKey: issue.key,
        results
      },
      null,
      2
    ),
    "utf8"
  );

  console.log(`Skill metadata live test OK. Report written to ${reportPath}`);
  console.log(`Created issue: ${issue.key}`);
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
