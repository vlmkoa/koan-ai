// app/api/chat/route.ts
import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT, FEW_SHOT_EXEMPLARS } from "@/lib/system-prompt";

// Request-shape limits — deployed publicly, this route spends the owner's API
// key. Output is capped at 150 tokens but *input* tokens are where the cost
// amplification lives, so cap the request to exactly what app/page.tsx sends:
// a modest list of {role, content: string} turns.
const MAX_MESSAGES = 50;
const MAX_CONTENT_CHARS = 8000;

type ChatMessage = { role: "user" | "assistant"; content: string };

function isValidMessages(value: unknown): value is ChatMessage[] {
  return (
    Array.isArray(value) &&
    value.length >= 1 &&
    value.length <= MAX_MESSAGES &&
    value.every((m) => {
      if (m === null || typeof m !== "object") return false;
      const { role, content } = m as Record<string, unknown>;
      return (
        (role === "user" || role === "assistant") &&
        typeof content === "string" &&
        content.length > 0 &&
        content.length <= MAX_CONTENT_CHARS
      );
    })
  );
}

// Few-shot exemplars are prepended in-context to demonstrate the koan response
// shape. (Corrected 2026-06: the system prompt alone establishes the koan
// behavior; the exemplars refine facts, grounding, and symmetry consistency —
// see the correction banner in CLAUDE.md.)
//
// The final exemplar carries a cache breakpoint so the stable prefix — system
// prompt + all exemplar turns — is cached across requests. Response-identical
// to plain strings; only cost and latency change.
const CACHED_EXEMPLARS: Anthropic.MessageParam[] = FEW_SHOT_EXEMPLARS.map(
  (m, i) =>
    i === FEW_SHOT_EXEMPLARS.length - 1
      ? {
          role: m.role,
          content: [
            {
              type: "text" as const,
              text: m.content,
              cache_control: { type: "ephemeral" as const },
            },
          ],
        }
      : m
);

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: "ANTHROPIC_API_KEY not set" }, { status: 500 });
  }
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const messages = (body as { messages?: unknown } | null)?.messages;
  if (!isValidMessages(messages)) {
    return Response.json({ error: "Invalid messages" }, { status: 400 });
  }

  // Stream the response. `.stream()` returns synchronously; upstream API
  // errors surface inside the for-await loop below.
  const stream = client.messages.stream({
    model: "claude-sonnet-4-5",
    max_tokens: 150,
    system: SYSTEM_PROMPT,
    messages: [...CACHED_EXEMPLARS, ...messages],
  });

  // Return as a readable stream
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(chunk.delta.text));
          }
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
    cancel() {
      // Client disconnected — stop paying for upstream tokens.
      stream.controller.abort();
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
