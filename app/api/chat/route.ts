// app/api/chat/route.ts
import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT, FEW_SHOT_EXEMPLARS } from "@/lib/system-prompt";

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: "ANTHROPIC_API_KEY not set" }, { status: 500 });
  }
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const { messages } = await req.json();

  // Validate
  if (!messages || !Array.isArray(messages)) {
    return Response.json({ error: "Invalid messages" }, { status: 400 });
  }

  // Stream the response. Few-shot exemplars are prepended in-context to demonstrate
  // the koan response shape — system-prompt instructions alone (v3, v4) could not
  // override Sonnet's balanced-explainer prior on confident_* prompts.
  const stream = await client.messages.stream({
    model: "claude-sonnet-4-5",
    max_tokens: 500,
    system: SYSTEM_PROMPT,
    messages: [...FEW_SHOT_EXEMPLARS, ...messages],
  });

  // Return as a readable stream
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            controller.enqueue(new TextEncoder().encode(chunk.delta.text));
          }
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
