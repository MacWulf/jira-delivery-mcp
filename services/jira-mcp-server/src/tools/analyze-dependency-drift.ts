import { z } from "zod";

import { toolText } from "../lib/mcp.js";
import type {
  DependencyDriftService,
  ExpectedDependencyInput
} from "../services/dependency-drift-service.js";

const expectedDependencySchema = z.object({
  sourceIssueKey: z.string().min(1),
  targetIssueKey: z.string().min(1),
  typeName: z.string().min(1).optional()
});

export function registerAnalyzeDependencyDriftTool(
  server: { registerTool: Function },
  dependencyDriftService: DependencyDriftService
) {
  server.registerTool(
    "analyze_dependency_drift",
    {
      title: "Analyze Jira dependency drift",
      description:
        "Inspect actual Jira dependency links, compare them with an optional expected dependency blueprint, and flag duplicate or stale candidates.",
      inputSchema: {
        projectKey: z.string().min(1).optional(),
        jql: z.string().min(1).optional(),
        expectedDependencies: z.array(expectedDependencySchema).optional()
      }
    },
    async (input: {
      projectKey?: string;
      jql?: string;
      expectedDependencies?: ExpectedDependencyInput[];
    }) => {
      const report = await dependencyDriftService.analyze(input);

      return {
        ...toolText(
          `Analyzed dependency drift for ${report.projectKey ?? "custom scope"}.`
        ),
        structuredContent: report
      };
    }
  );
}
