import { NextResponse } from "next/server";
import { getDueScheduledClips, getProject, getSocialAccount, updateClip } from "@/lib/db";
import type { SocialPlatform } from "@/lib/types";
import {
  publishToYouTube,
  publishToTikTok,
  publishToInstagram,
  publishToTwitter,
} from "@/lib/social/platforms";

export async function POST() {
  const due = getDueScheduledClips();
  if (due.length === 0) return NextResponse.json({ fired: 0 });

  const fired: string[] = [];
  const errors: Record<string, string> = {};

  for (const clip of due) {
    const clipId = clip.id as string;
    const filePath = clip.file_path as string | undefined;
    const platforms = JSON.parse((clip.scheduled_platforms as string) || "[]") as SocialPlatform[];

    if (!filePath || platforms.length === 0) {
      // Clear the schedule so it doesn't retry endlessly
      updateClip(clipId, { scheduled_publish_at: null, scheduled_platforms: null });
      continue;
    }

    const project = getProject(clip.project_id as string);
    const title = (clip.title ?? "Clip") as string;
    const description = (clip.description ?? "") as string;

    for (const platform of platforms) {
      const account = getSocialAccount(platform);
      if (!account?.connected || !account.access_token) continue;
      const token = account.access_token as string;

      try {
        if (platform === "youtube")   await publishToYouTube(token, filePath, title, description);
        if (platform === "tiktok")    await publishToTikTok(token, filePath, title);
        if (platform === "instagram") await publishToInstagram(token, clipId, description || title);
        if (platform === "twitter")   await publishToTwitter(token, filePath, description || title);
        fired.push(`${clipId}:${platform}`);
      } catch (e) {
        errors[`${clipId}:${platform}`] = e instanceof Error ? e.message : String(e);
      }
    }

    // Clear schedule regardless — don't retry on partial failure
    updateClip(clipId, {
      scheduled_publish_at: null,
      scheduled_platforms: null,
      status: "published",
    });
  }

  return NextResponse.json({ fired: fired.length, details: fired, errors });
}
