import { convertToModelMessages, UIMessage } from 'ai';
import { createAgent } from '@/lib/agent';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const githubToken = req.headers.get('x-github-token');
  if (!githubToken) {
    return new Response('Unauthorized: GitHub token missing', { status: 401 });
  }

  const provider = req.headers.get('x-ai-provider') || 'deepseek';
  const model = req.headers.get('x-ai-model') || 'deepseek-v4-flash';
  const apiKey = req.headers.get('x-ai-api-key') || '';

  const { messages }: { messages: UIMessage[] } = await req.json();

  try {
    const agent = await createAgent(githubToken, provider, model, apiKey);

    const result = await agent.stream({
      messages: await convertToModelMessages(messages),
    });

    return result.toUIMessageStreamResponse();
  } catch (error: any) {
    console.error("Agent initialization or execution failed:", error);
    return new Response(
      JSON.stringify({ error: error.message || 'An error occurred during agent execution.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}