import { z } from "zod";

import type { ArchitectDecisionRecordInput } from "../domain/architect-decision-record.js";
import { buildArchitectDecisionSafetyPlan } from "../domain/architect-decision-safety.js";
import { toolText } from "../lib/mcp.js";
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

export function registerPlanArchitectDecisionSafetyTool(
  server: { registerTool: Function },
  documentPublishingService: DocumentPublishingService
) {
  server.registerTool(
    "plan_architect_decision_safety",
    {
      title: "Plan Architect decision safety",
      description:
        "Check existing ADRs for overlap, plan affected issue blocking, and propose bounded spike work when architecture confidence is low.",
      inputSchema: {
        ...architectDecisionInputSchema,
        spaceId: z.string().min(1).optional(),
        architectureGapReason: z.string().min(1).optional()
      }
    },
    async (
      input: ArchitectDecisionRecordInput & {
        spaceId?: string;
        architectureGapReason?: string;
      }
    ) => {
      const existingAdrPages = await documentPublishingService.searchArchitectAdrPages({
        ...(input.spaceId ? { spaceId: input.spaceId } : {})
      });
      const safetyPlan = buildArchitectDecisionSafetyPlan({
        decision: input,
        existingAdrPages,
        ...(input.architectureGapReason
          ? { architectureGapReason: input.architectureGapReason }
          : {})
      });

      return {
        ...toolText(`Planned Architect decision safety for ${safetyPlan.adrTitle}.`),
        structuredContent: safetyPlan
      };
    }
  );
}
