import { toolText } from "../lib/mcp.js";
import type { JiraApi } from "../services/jira-api.js";

export function registerGetIssueLinkTypesTool(
  server: { registerTool: Function },
  jiraApi: JiraApi
) {
  server.registerTool(
    "get_issue_link_types",
    {
      title: "Get Jira issue link types",
      description: "Fetch the issue link types available in this Jira site."
    },
    async () => {
      const linkTypes = await jiraApi.getIssueLinkTypes();

      return {
        ...toolText(
          `Fetched ${linkTypes.issueLinkTypes?.length ?? 0} issue link types.`
        ),
        structuredContent: {
          linkTypes: linkTypes.issueLinkTypes ?? []
        }
      };
    }
  );
}
