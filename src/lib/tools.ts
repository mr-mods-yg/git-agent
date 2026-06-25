// github-tools.ts
import { createMCPClient } from "@ai-sdk/mcp";
import { config } from "./config";

export async function getGithubTools() {
  const github_mcp_client = await createMCPClient({
    transport: {
      type: "http",
      url: "https://api.githubcopilot.com/mcp/",
      headers: {
        Authorization: `Bearer ${config.githubToken}`,
      },
    },
  });

  const github_tools = await github_mcp_client.tools();

  return { github_tools, github_mcp_client };
}