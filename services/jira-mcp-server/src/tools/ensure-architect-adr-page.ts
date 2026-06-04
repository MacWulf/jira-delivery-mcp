import { z } from "zod";

import type { AppConfig } from "../config.js";
import { toolText } from "../lib/mcp.js";
import {
  buildDryRunResult,
  ensureWriteAllowed
} from "../policy/write-policy.js";
import type {
  ArchitectDecisionRecordInput
} from "../domain/architect-decision-record.js";
import type { DocumentPublishingService } from "../services/document-publishing-service.js";

const architectDecisionInputSchema = {
  title: z.string().min(1),
  status: z.enum(["proposed", "accepted", "superseded", "deprecated"]),
  context: z.string().min(1),
  decision: z.string().min(1),
  decisionReason: z.string().min(1),
  confidenceLevel: z.enum(["high", "medium", "low"]),
  severityScope: z.enum(["local", "cross-module", "system-wide"]),
  targetQualityAttributes: z.array(z.string().min(1)),
  hardConstraints: z.array(z.string().min(1)),
  rejectedAlternatives: z.array(
    z.object({
      option: z.string().min(1),
      reason: z.string().min(1)
    })
  ),
  affectedJiraIssues: z.array(
    z.object({
      issueKey: z.string().min(1),
      relationship: z.string().min(1),
      impact: z.enum(["direct", "parent-context"])
    })
  ),
  migrationStyle: z.enum(["big-bang", "incremental"]),
  cleanupObligations: z.array(z.string().min(1)),
  technicalDebtCreated: z.array(z.string().min(1)),
  followUpActions: z.array(
    z.object({
      summary: z.string().min(1),
      followUpType: z.string().min(1),
      primaryOwningSkill: z.string().min(1),
      migrationStyle: z.enum(["big-bang", "incremental"]).optional(),
      cleanupRequiredBeforeClosure: z.boolean().optional()
    })
  ),
  requiredReviewMode: z.enum([
    "no-extra-review",
    "bounded-spike",
    "manual-human-review"
  ]),
  linkedArchitecturePages: z.array(
    z.object({
      title: z.string().min(1),
      url: z.string().min(1).optional(),
      relationship: z.string().min(1).optional()
    })
  ),
  projectKey: z.string().min(1).optional()
};

export function registerEnsureArchitectAdrPageTool(
  server: { registerTool: Function },
  documentPublishingService: DocumentPublishingService,
  config: AppConfig
) {
  server.registerTool(
    "ensure_architect_adr_page",
    {
      title: "Ensure Architect ADR page",
      description:
        "Create or update a Confluence-first Architect ADR page after exact identity check.",
      inputSchema: {
        ...architectDecisionInputSchema,
        sourceIssueKey: z.string().min(1).optional(),
        spaceId: z.string().min(1).optional(),
        parentId: z.string().min(1).optional(),
        confirm: z.boolean().optional()
      }
    },
    async (
      input: ArchitectDecisionRecordInput & {
        sourceIssueKey?: string;
        spaceId?: string;
        parentId?: string;
        confirm?: boolean;
      }
    ) => {
      const plan = await documentPublishingService.planArchitectAdrPage(input);
      const writeMode = ensureWriteAllowed(
        config,
        "ensure_architect_adr_page",
        input.confirm
      );

      if (writeMode.mode === "dry-run") {
        return {
          ...toolText(`Dry-run: would ${plan.upsertDecision.action} ${plan.title}.`),
          structuredContent: buildDryRunResult("ensure_architect_adr_page", plan)
        };
      }

      const result = await documentPublishingService.ensureArchitectAdrPage(input);
      const verb =
        result.action === "created"
          ? "Created"
          : result.action === "updated"
            ? "Updated"
            : "Stopped on";

      return {
        ...toolText(`${verb} Architect ADR page ${result.title}.`),
        structuredContent: result
      };
    }
  );
}
