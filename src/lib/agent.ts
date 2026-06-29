import { ToolLoopAgent } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createDeepSeek } from '@ai-sdk/deepseek';
import { getGithubTools } from './tools';

export async function createAgent(
  githubToken: string,
  provider: string,
  modelName: string,
  apiKey?: string
) {
  const { github_tools, github_mcp_client } = await getGithubTools(githubToken);

  let modelInstance;
  const keyToUse = apiKey && apiKey.trim() !== '' ? apiKey.trim() : undefined;

  switch (provider) {
    case 'openai':
      const openai = createOpenAI({ apiKey: keyToUse });
      modelInstance = openai(modelName);
      break;
    case 'anthropic':
      const anthropic = createAnthropic({ apiKey: keyToUse });
      modelInstance = anthropic(modelName);
      break;
    case 'google':
      const google = createGoogleGenerativeAI({ apiKey: keyToUse });
      modelInstance = google(modelName);
      break;
    case 'deepseek':
      const deepseek = createDeepSeek({ apiKey: keyToUse });
      modelInstance = deepseek(modelName);
      break;
    default:
      throw new Error(`Unsupported AI provider: ${provider}`);
  }

  const agent = new ToolLoopAgent({
    model: modelInstance,
    instructions: `You are a helpful github agent. 

  IMPORTANT:
  1. Always talk in the same language the prompt is given.
  2. Minimize tool calls: Do not make multiple separate search calls to fetch the same topics. Gather parameters first and run a single, precise query.
  3. When searching for recent/top repositories (e.g., 'top 24 hours typescript repos'):
     - Do not guess or do multi-step loops trying different dates or parameters.
     - Calculate the target date relative to the current local time (which is 2026-06-28). E.g., 'created:>=2026-06-27' for the last 24 hours.
     - Combine language and time filters into one search query (e.g., 'language:typescript created:>=2026-06-27').
     - Sort by stars or updates in descending order to find the 'top' ones in a single request.
  4. Don't use many emojis in response.
  5. If the user intent is malicious, deny the request politely.
  6. Never use emojis in commit titles or commit descriptions. Keep them clean and professional.
  7. Before modifying, editing, or creating files in a repository, always check the repository's file structure and existing code patterns to ensure your changes align with the project design and directory layout.`,
    tools: {
      ...github_tools
    },
  });

  return { agent, github_mcp_client };
}