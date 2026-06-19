import { NextResponse } from "next/server";
import { getClip, getProject, getSocialAccount, updateClip, updateSocialAccount } from "@/lib/db";
import type { SocialPlatform } from "@/lib/types";
import {
  publishToYouTube,
  publishToTikTok,
  publishToInstagram,
  publishToTwitter,
  refreshAccessToken,
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

    let accessToken = account.access_token as string;
    const expiresAt = account.expires_at as string | undefined;
    const refreshToken = account.refresh_token as string | undefined;

    // Refresh the access token if it's expired (or about to expire)
    if (expiresAt && new Date(expiresAt).getTime() <= Date.now() + 60_000) {
      if (!refreshToken) {
        results[platform] = {
          success: false,
          error: `${platform} access token expired and no refresh token is stored. Reconnect in Settings.`,
        };
        continue;
      }
      try {
        const refreshed = await refreshAccessToken(platform, refreshToken);
        accessToken = refreshed.access_token;
        const newExpiresAt = refreshed.expires_in
          ? new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
          : undefined;
        updateSocialAccount(platform, {
          connected: 1,
          username: account.username as string,
          access_token: accessToken,
          refresh_token: refreshed.refresh_token ?? refreshToken,
          expires_at: newExpiresAt,
        });
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        results[platform] = {
          success: false,
          error: `${platform} token refresh failed: ${message}. Reconnect in Settings.`,
        };
        continue;
      }
    }

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
