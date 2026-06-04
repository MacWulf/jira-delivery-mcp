import { z } from "zod";

import { toolText } from "../lib/mcp.js";
import type {
  ArchitectDecisionConfidence,
  ArchitectDecisionRecordInput,
  ArchitectDecisionScope,
  ArchitectDecisionStatus,
  ArchitectMigrationStyle,
  ArchitectReviewMode
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

export function registerPlanArchitectAdrPageTool(
  server: { registerTool: Function },
  documentPublishingService: DocumentPublishingService
) {
  server.registerTool(
    "plan_architect_adr_page",
    {
      title: "Plan Architect ADR page",
      description:
        "Plan a Confluence-first Architect ADR page with deterministic title, labels, taxonomy hints, and upsert behavior.",
      inputSchema: {
        ...architectDecisionInputSchema,
        sourceIssueKey: z.string().min(1).optional(),
        spaceId: z.string().min(1).optional(),
        parentId: z.string().min(1).optional()
      }
    },
    async (
      input: ArchitectDecisionRecordInput & {
        sourceIssueKey?: string;
        spaceId?: string;
        parentId?: string;
      }
    ) => {
      const plan = await documentPublishingService.planArchitectAdrPage(input);

      return {
        ...toolText(`Planned Architect ADR page ${plan.title}.`),
        structuredContent: plan
      };
    }
  );
}
