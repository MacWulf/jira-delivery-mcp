import "./bootstrap/load-env.js";

import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  compareIssuesByPriority,
  findTransitionByName,
  hasOpenBlockingDependency,
  isDoneIssue,
  type JiraIssueForSelection
} from "./policy/assistant-policy.js";
import { loadConfig } from "./config.js";
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
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const label = `validation-smoke-${timestamp.toLowerCase()}`;
  const projectKey = config.validationProjectKey;

  if (!projectKey) {
    throw new Error(
      "Missing JIRA_VALIDATION_PROJECT_KEY. Refusing to run validation writes in the default delivery project."
    );
  }
  const results: StepResult[] = [];

  const parent = await jiraApi.createIssue({
    projectKey,
    issueType: "Task",
    summary: `[Validation] Parent ${timestamp}`,
    description:
      "Automatically created validation issue. Safe to keep or delete.",
    labels: [label, "validation-smoke"]
  });
  results.push({
    step: "create parent issue",
    ok: true,
    details: {
      key: parent.key
    }
  });

  const child = await jiraApi.createIssue({
    projectKey,
    issueType: "Task",
    summary: `[Validation] Child ${timestamp}`,
    description:
      "Automatically created validation issue. Safe to keep or delete.",
    labels: [label, "validation-smoke"]
  });
  results.push({
    step: "create child issue",
    ok: true,
    details: {
      key: child.key
    }
  });

  await jiraApi.updateIssue({
    issueKey: parent.key,
    fields: {
      summary: `[Validation] Parent ${timestamp} (updated)`,
      description: {
        type: "doc",
        version: 1,
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Updated by the live Jira assistant test flow."
              }
            ]
          }
        ]
      }
    }
  });
  results.push({
    step: "update parent issue",
    ok: true,
    details: {
      key: parent.key
    }
  });

  const comment = await jiraApi.addComment({
    issueKey: parent.key,
    comment: `Live test comment at ${new Date().toISOString()}`
  });
  results.push({
    step: "add comment",
    ok: true,
    details: {
      key: parent.key,
      commentId: comment.id
    }
  });

  const worklog = await jiraApi.addWorklog({
    issueKey: parent.key,
    timeSpentSeconds: 600,
    comment: "Live test worklog entry",
    started: formatJiraStartedTimestamp(new Date())
  });
  results.push({
    step: "add worklog",
    ok: true,
    details: {
      key: parent.key,
      worklogId: worklog.id ?? null
    }
  });

  const linkTypes = await jiraApi.getIssueLinkTypes();
  const preferredLink =
    (linkTypes.issueLinkTypes ?? []).find((item) => item.name === "Relates") ??
    linkTypes.issueLinkTypes?.[0];

  if (!preferredLink?.name) {
    throw new Error("No issue link type available for validation.");
  }

  await jiraApi.linkIssues({
    typeName: preferredLink.name,
    inwardIssueKey: parent.key,
    outwardIssueKey: child.key,
    comment: "Live test issue link"
  });
  results.push({
    step: "link issues",
    ok: true,
    details: {
      from: parent.key,
      to: child.key,
      type: preferredLink.name
    }
  });

  const transitions = await jiraApi.getTransitions(parent.key);
  const preferredTransition =
    findTransitionByName(transitions.transitions, "In Progress") ??
    findTransitionByName(transitions.transitions, "Start Progress") ??
    transitions.transitions[0];

  if (!preferredTransition) {
    throw new Error(`No transition available for ${parent.key}.`);
  }

  await jiraApi.transitionIssue({
    issueKey: parent.key,
    transitionId: preferredTransition.id,
    comment: "Live test transition"
  });
  results.push({
    step: "transition issue",
    ok: true,
    details: {
      key: parent.key,
      transition: preferredTransition.name
    }
  });

  const search = await jiraApi.searchIssues({
    jql: `project = ${projectKey} AND labels = "${label}" ORDER BY created ASC`,
    maxResults: 20,
    fields: ["summary", "status", "priority", "issuelinks"]
  });
  results.push({
    step: "search validation issues",
    ok: true,
    details: {
      count: search.issues.length
    }
  });

  const pickCandidate = (search.issues as JiraIssueForSelection[])
    .filter((issue) => !isDoneIssue(issue))
    .filter((issue) => !hasOpenBlockingDependency(issue))
    .sort(compareIssuesByPriority)[0];

  results.push({
    step: "pick next issue logic",
    ok: true,
    details: {
      selected: pickCandidate?.key ?? null
    }
  });

  const reportPath = resolve(
    process.cwd(),
    "artifacts",
    `live-test-report-${timestamp}.json`
  );

  await mkdir(resolve(process.cwd(), "artifacts"), { recursive: true });
  await writeFile(
    reportPath,
    JSON.stringify(
      {
        ranAt: new Date().toISOString(),
        projectKey,
        label,
        results
      },
      null,
      2
    ),
    "utf8"
  );

  console.log(`Validation flow OK. Report written to ${reportPath}`);
  console.log(`Created issues: ${parent.key}, ${child.key}`);
  console.log(`Transition used: ${preferredTransition.name}`);
  console.log(`Pick-next candidate: ${pickCandidate?.key ?? "none"}`);
}

function requireLiveConfirmation(): void {
  if (!process.argv.includes("--confirm-live")) {
    throw new Error(
      "Refusing to run live Jira writes without the --confirm-live flag."
    );
  }
}

function formatJiraStartedTimestamp(date: Date): string {
  const year = String(date.getFullYear());
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  const milliseconds = String(date.getMilliseconds()).padStart(3, "0");
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absoluteOffset = Math.abs(offsetMinutes);
  const offsetHours = pad(Math.floor(absoluteOffset / 60));
  const offsetRemainderMinutes = pad(absoluteOffset % 60);

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}${sign}${offsetHours}${offsetRemainderMinutes}`;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

main().catch((error) => {
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(String(error));
  }

  process.exitCode = 1;
});
