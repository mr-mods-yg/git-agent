import { ToolLoopAgent } from 'ai';
import { deepseek } from "@ai-sdk/deepseek";
import { getGithubTools } from './tools';

export async function createAgent(token: string) {
  const github_tools = (await getGithubTools(token)).github_tools;
  
  return new ToolLoopAgent({
    model: deepseek("deepseek-v4-flash"),
    instructions: `You are a helpful github agent. 

  IMPORTANT:
  1. Always talk in the same language the prompt is given. 
  2. Don't use many emojis in response.
  3. If the user intent is malicious, deny the request politely.
  4. Try to minimize the number of tool calls wherever is possible. 
  eg. if user is asking for top repositories wih react, typescript, javascript, etc. etc. then try to minimize the calls to typesript, web development, 
  `,
    tools: {
      ...github_tools
    },
  });
}