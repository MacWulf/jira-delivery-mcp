import { z } from "zod";

import type { AppConfig } from "../config.js";
import { toolText } from "../lib/mcp.js";
import { buildDryRunResult, ensureWriteAllowed } from "../policy/write-policy.js";
import type { ProjectKickoffService } from "../services/project-kickoff-service.js";

export function registerSeedProjectKickoffTool(
  server: { registerTool: Function },
  kickoffService: ProjectKickoffService,
  config: AppConfig
) {
  server.registerTool(
    "seed_project_kickoff",
    {
      title: "Seed project kickoff backlog",
      description:
        "Seed a reusable Codex-managed kickoff backlog into a Jira software project and optionally start the first work item.",
      inputSchema: {
        projectKey: z.string().min(1).optional(),
        startFirstIssue: z.boolean().default(true),
        assigneeAccountId: z.string().min(1).optional(),
        confirm: z.boolean().optional()
      }
    },
    async (input: {
      projectKey?: string;
      startFirstIssue?: boolean;
      assigneeAccountId?: string;
      confirm?: boolean;
    }) => {
      const projectKey = input.projectKey ?? config.defaultProjectKey;

      if (!projectKey) {
        throw new Error(
          "Missing projectKey and no JIRA_DEFAULT_PROJECT_KEY is configured."
        );
      }

      const writeMode = ensureWriteAllowed(
        config,
        "create_issue",
        input.confirm
      );
      const template = kickoffService.buildDefaultTemplate();

      if (writeMode.mode === "dry-run") {
        return {
          ...toolText(`Dry-run: would seed kickoff backlog in ${projectKey}.`),
          structuredContent: buildDryRunResult("create_issue", {
            projectKey,
            template: template.key,
            itemCount: template.items.length,
            dependencyCount: template.dependencies.length,
            startFirstIssue: input.startFirstIssue ?? true
          })
        };
      }

      const payload: {
        projectKey: string;
        startFirstIssue?: boolean;
        assigneeAccountId?: string;
      } = {
        projectKey
      };

      if (input.startFirstIssue !== undefined) {
        payload.startFirstIssue = input.startFirstIssue;
      }

      if (input.assigneeAccountId) {
        payload.assigneeAccountId = input.assigneeAccountId;
      }

      const result = await kickoffService.seedDefaultTemplate(payload);

      return {
        ...toolText(`Seeded kickoff backlog in ${projectKey}.`),
        structuredContent: result
      };
    }
  );
}
