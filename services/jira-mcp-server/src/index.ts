import "./bootstrap/load-env.js";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { loadConfig } from "./config.js";
import { JiraApi } from "./services/jira-api.js";
import { registerTools } from "./tools/index.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const jiraApi = new JiraApi(config);
  const server = new McpServer({
    name: "jira-mcp-server",
    version: "0.1.0"
  });

  registerTools(server, jiraApi, config);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
