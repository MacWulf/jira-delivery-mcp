import { z } from "zod";

import { resolveSecretValue } from "./secrets/resolve-secret.js";

const envSchema = z.object({
  JIRA_BASE_URL: z.url(),
  JIRA_EMAIL: z.email(),
  JIRA_API_TOKEN: z.string().min(1).optional(),
  JIRA_API_TOKEN_DPAPI_FILE: z.string().min(1).optional(),
  JIRA_DEFAULT_PROJECT_KEY: z.string().min(1).optional(),
  JIRA_TEST_PROJECT_KEY: z.string().min(1).optional(),
  JIRA_DEFAULT_PICK_NEXT_JQL: z.string().min(1).optional(),
  JIRA_EXECUTION_MODE: z.enum(["dry-run", "live"]).default("dry-run"),
  JIRA_REQUIRE_CONFIRMATION: z.stringbool().default(true),
  JIRA_SELECTED_TRANSITION_NAMES: z.string().min(1).optional(),
  JIRA_IN_PROGRESS_TRANSITION_NAMES: z.string().min(1).optional(),
  JIRA_REVIEW_TRANSITION_NAMES: z.string().min(1).optional(),
  JIRA_QA_TRANSITION_NAMES: z.string().min(1).optional(),
  JIRA_BLOCKED_TRANSITION_NAMES: z.string().min(1).optional(),
  JIRA_DONE_TRANSITION_NAMES: z.string().min(1).optional(),
  CONFLUENCE_BASE_URL: z.url().optional(),
  CONFLUENCE_EMAIL: z.email().optional(),
  CONFLUENCE_API_TOKEN: z.string().min(1).optional(),
  CONFLUENCE_API_TOKEN_DPAPI_FILE: z.string().min(1).optional()
});

export type AppConfig = {
  jiraBaseUrl: string;
  jiraEmail: string;
  jiraApiToken: string;
  executionMode: "dry-run" | "live";
  requireConfirmation: boolean;
  defaultProjectKey?: string;
  testProjectKey?: string;
  defaultPickNextJql?: string;
  selectedTransitionNames: string[];
  inProgressTransitionNames: string[];
  reviewTransitionNames: string[];
  qaTransitionNames: string[];
  blockedTransitionNames: string[];
  doneTransitionNames: string[];
  confluenceBaseUrl?: string;
  confluenceEmail?: string;
  confluenceApiToken?: string;
};

export function loadConfig(): AppConfig {
  const env = envSchema.parse(process.env);
  const jiraApiToken = resolveSecretValue({
    secretName: "JIRA_API_TOKEN",
    directValue: env.JIRA_API_TOKEN,
    dpapiFilePath: env.JIRA_API_TOKEN_DPAPI_FILE,
    required: true
  });
  const confluenceApiToken =
    resolveSecretValue({
      secretName: "CONFLUENCE_API_TOKEN",
      directValue: env.CONFLUENCE_API_TOKEN,
      dpapiFilePath: env.CONFLUENCE_API_TOKEN_DPAPI_FILE
    }) ?? jiraApiToken;

  const config: AppConfig = {
    jiraBaseUrl: trimTrailingSlash(env.JIRA_BASE_URL),
    jiraEmail: env.JIRA_EMAIL,
    jiraApiToken,
    executionMode: env.JIRA_EXECUTION_MODE,
    requireConfirmation: env.JIRA_REQUIRE_CONFIRMATION,
    selectedTransitionNames: parseTransitionNames(
      env.JIRA_SELECTED_TRANSITION_NAMES,
      ["Selected", "Select Work", "Ready", "Move To Selected"]
    ),
    inProgressTransitionNames: parseTransitionNames(
      env.JIRA_IN_PROGRESS_TRANSITION_NAMES,
      [
        "In Progress",
        "Start Progress",
        "Start Work",
        "Doing",
        "Development",
        "Resume Work"
      ]
    ),
    reviewTransitionNames: parseTransitionNames(
      env.JIRA_REVIEW_TRANSITION_NAMES,
      ["In Review", "Review", "Ready for Review", "Code Review", "Work Done"]
    ),
    qaTransitionNames: parseTransitionNames(
      env.JIRA_QA_TRANSITION_NAMES,
      ["QA", "Send To QA", "Ready For QA", "Testing"]
    ),
    blockedTransitionNames: parseTransitionNames(
      env.JIRA_BLOCKED_TRANSITION_NAMES,
      ["Blocked", "Mark Blocked", "On Hold", "Waiting"]
    ),
    doneTransitionNames: parseTransitionNames(
      env.JIRA_DONE_TRANSITION_NAMES,
      ["Done", "Closed", "Resolved", "Accepted"]
    ),
    confluenceEmail: env.CONFLUENCE_EMAIL ?? env.JIRA_EMAIL,
    confluenceApiToken
  };

  if (env.JIRA_DEFAULT_PROJECT_KEY) {
    config.defaultProjectKey = env.JIRA_DEFAULT_PROJECT_KEY;
  }

  if (env.JIRA_TEST_PROJECT_KEY) {
    config.testProjectKey = env.JIRA_TEST_PROJECT_KEY;
  }

  if (env.JIRA_DEFAULT_PICK_NEXT_JQL) {
    config.defaultPickNextJql = env.JIRA_DEFAULT_PICK_NEXT_JQL;
  }

  if (env.CONFLUENCE_BASE_URL) {
    config.confluenceBaseUrl = trimTrailingSlash(env.CONFLUENCE_BASE_URL);
  }

  return config;
}

function trimTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function parseTransitionNames(
  rawValue: string | undefined,
  fallback: string[]
): string[] {
  const values = rawValue
    ?.split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return values?.length ? values : fallback;
}
