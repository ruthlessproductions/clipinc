import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getSetting } from "@/lib/db";

const SYSTEM_PROMPT = `You are a helpful assistant for a video clip creation tool called Clipinc.
Your job is to help the user describe what kind of clips they want to find in their video before the AI analysis runs.

Ask clarifying questions to understand:
- Any specific moments or topics they remember and want to find
- The tone they want (funny, educational, inspiring, controversial, etc.)
- The target platform (TikTok, YouTube Shorts, Instagram Reels, etc.)
- Target audience or any other context

Keep responses concise and friendly. Once you have enough context, let the user know they can click "Start Analysis" and you'll pass their context along to guide the clip detection.`;

type Msg = { role: "user" | "assistant"; content: string };

export async function POST(req: Request) {
  const { message, history = [] } = await req.json() as { message: string; history: Msg[] };
  if (!message?.trim()) return NextResponse.json({ error: "Empty message" }, { status: 400 });

  const messages: Msg[] = [...history, { role: "user", content: message.trim() }];
  const provider = getSetting("model_provider") ?? "local";

  // ── Claude streaming ──────────────────────────────────────────────────────
  if (provider === "claude") {
    const apiKey = getSetting("claude_api_key") || process.env.ANTHROPIC_API_KEY || "";
    if (!apiKey) {
      return NextResponse.json(
        { error: "Claude API key not set. Add it in Settings → AI Model." },
        { status: 400 }
      );
    }

    const client = new Anthropic({ apiKey });
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const response = await client.messages.stream({
            model: "claude-opus-4-5",
            max_tokens: 512,
            system: SYSTEM_PROMPT,
            messages,
          });
          for await (const chunk of response) {
            if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
              controller.enqueue(new TextEncoder().encode(chunk.delta.text));
            }
          }
        } catch (e) {
          controller.enqueue(new TextEncoder().encode(`\n\n[Error: ${e instanceof Error ? e.message : String(e)}]`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  // ── Local oMLX ────────────────────────────────────────────────────────────
  const omlxUrl = process.env.OMLX_URL || "http://localhost:8000";
  const omlxModel = process.env.OMLX_MODEL || "mlx-community/Llama-3.3-70B-Instruct-4bit";
  const omlxKey = process.env.OMLX_API_KEY || "";

  try {
    const res = await fetch(`${omlxUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(omlxKey ? { Authorization: `Bearer ${omlxKey}` } : {}),
      },
      body: JSON.stringify({
        model: omlxModel,
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
        temperature: 0.7,
        max_tokens: 512,
      }),
    });
    if (!res.ok) throw new Error(`oMLX responded ${res.status}`);
    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content ?? "Could you tell me more about what you're looking for?";
    return NextResponse.json({ reply });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
