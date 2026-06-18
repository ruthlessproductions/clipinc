import { NextResponse } from "next/server";
import { getClip, getProject, getSocialAccount, updateClip } from "@/lib/db";
import type { SocialPlatform } from "@/lib/types";
import {
  publishToYouTube,
  publishToTikTok,
  publishToInstagram,
  publishToTwitter,
} from "@/lib/social/platforms";

export async function POST(req: Request) {
  const { clip_id, platforms, title, description } = (await req.json()) as {
    clip_id: string;
    platforms: SocialPlatform[];
    title?: string;
    description?: string;
  };

  const clip = getClip(clip_id);
  if (!clip) {
    return NextResponse.json({ error: "Clip not found" }, { status: 404 });
  }

  const filePath = clip.file_path as string | undefined;
  if (!filePath) {
    return NextResponse.json(
      { error: "Clip must be exported before publishing. Click Export first." },
      { status: 422 }
    );
  }

  const project = getProject(clip.project_id as string);
  const clipTitle = (title ?? clip.title ?? "My Clip") as string;
  const clipDesc = (description ?? clip.description ?? "") as string;

  const results: Record<string, { success: boolean; url?: string; error?: string }> = {};

  for (const platform of platforms) {
    const account = getSocialAccount(platform);

    if (!account?.connected || !account.access_token) {
      results[platform] = {
        success: false,
        error: `${platform} is not connected. Go to Settings to link your account.`,
      };
      continue;
    }

    const accessToken = account.access_token as string;

    try {
      let result;
      if (platform === "youtube") {
        result = await publishToYouTube(accessToken, filePath, clipTitle, clipDesc);
      } else if (platform === "tiktok") {
        result = await publishToTikTok(accessToken, filePath, clipTitle);
      } else if (platform === "instagram") {
        result = await publishToInstagram(accessToken, clip_id, clipDesc || clipTitle);
      } else if (platform === "twitter") {
        result = await publishToTwitter(accessToken, filePath, clipDesc || clipTitle);
      } else {
        results[platform] = { success: false, error: `Unknown platform: ${platform}` };
        continue;
      }

      results[platform] = { success: true, url: result.url };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      results[platform] = { success: false, error: message };
    }
  }

  const anySuccess = Object.values(results).some((r) => r.success);
  if (anySuccess) {
    updateClip(clip_id, { status: "published" });
  }

  return NextResponse.json({ results });
}
