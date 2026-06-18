import { NextResponse } from "next/server";
import { getSetting, setSetting } from "@/lib/db";

export async function GET() {
  return NextResponse.json({
    model_provider: getSetting("model_provider") ?? "local",
    claude_api_key:  getSetting("claude_api_key")  ?? "",
  });
}

export async function PATCH(req: Request) {
  const body = await req.json().catch(() => ({}));

  if (body.model_provider !== undefined) {
    if (!["local", "claude"].includes(body.model_provider)) {
      return NextResponse.json({ error: "Invalid model_provider" }, { status: 400 });
    }
    setSetting("model_provider", body.model_provider);
  }

  if (body.claude_api_key !== undefined) {
    setSetting("claude_api_key", body.claude_api_key);
  }

  return NextResponse.json({ ok: true });
}
