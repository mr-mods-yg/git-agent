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
  const github_tools = (await getGithubTools(githubToken)).github_tools;

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

  return new ToolLoopAgent({
    model: modelInstance,
    instructions: `You are a helpful github agent. 

  IMPORTANT:
  1. Always talk in the same language the prompt is given. 
  2. Don't use many emojis in response.
  3. If the user intent is malicious, deny the request politely.
  4. Try to minimize the number of tool calls wherever is possible. 
  eg. if user is asking for top repositories wih react, typescript, javascript, etc. etc. then try to minimize the calls to typesript, web development.`,
    tools: {
      ...github_tools
    },
  });
}