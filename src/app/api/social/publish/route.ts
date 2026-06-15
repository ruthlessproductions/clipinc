import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getClip, updateClip } from "@/lib/db";
import type { SocialPlatform } from "@/lib/types";

export async function POST(req: Request) {
  const { clip_id, platforms } = (await req.json()) as {
    clip_id: string;
    platforms: SocialPlatform[];
  };

  const clip = getClip(clip_id);
  if (!clip) {
    return NextResponse.json({ error: "Clip not found" }, { status: 404 });
  }

  if (!clip.file_path) {
    return NextResponse.json(
      { error: "Clip must be exported before publishing" },
      { status: 422 }
    );
  }

  const results: Record<string, { success: boolean; error?: string }> = {};

  for (const platform of platforms) {
    const account = db
      .prepare("SELECT * FROM social_accounts WHERE platform = ? AND connected = 1")
      .get(platform) as Record<string, unknown> | undefined;

    if (!account) {
      results[platform] = { success: false, error: "Account not connected" };
      continue;
    }

    results[platform] = {
      success: false,
      error: `${platform} publishing is configured but requires API credentials. Add your ${platform.toUpperCase()}_CLIENT_ID and ${platform.toUpperCase()}_CLIENT_SECRET to .env.local`,
    };
  }

  const anySuccess = Object.values(results).some((r) => r.success);
  if (anySuccess) {
    updateClip(clip_id, { status: "published" });
  }

  return NextResponse.json({ results });
}
