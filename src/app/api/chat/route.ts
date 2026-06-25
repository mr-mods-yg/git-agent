import { convertToModelMessages, UIMessage } from 'ai';
import { createAgent } from '@/lib/agent';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const token = req.headers.get('x-github-token');
  if (!token) {
    return new Response('Unauthorized: GitHub token missing', { status: 401 });
  }

  const { messages }: { messages: UIMessage[] } = await req.json();

  const agent = await createAgent(token);

  const result = await agent.stream({
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}