import type { SocialPlatform } from "../types";

interface PlatformConfig {
  label: string;
  authUrl: string;
  tokenUrl: string;
  scopes: string[];
  envClientId: string;
  envClientSecret: string;
}

export const platformConfigs: Record<SocialPlatform, PlatformConfig> = {
  tiktok: {
    label: "TikTok",
    authUrl: "https://www.tiktok.com/v2/auth/authorize/",
    tokenUrl: "https://open.tiktokapis.com/v2/oauth/token/",
    scopes: ["user.info.basic", "video.publish", "video.upload"],
    envClientId: "TIKTOK_CLIENT_KEY",
    envClientSecret: "TIKTOK_CLIENT_SECRET",
  },
  youtube: {
    label: "YouTube",
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: [
      "https://www.googleapis.com/auth/youtube.upload",
      "https://www.googleapis.com/auth/youtube.readonly",
    ],
    envClientId: "YOUTUBE_CLIENT_ID",
    envClientSecret: "YOUTUBE_CLIENT_SECRET",
  },
  instagram: {
    label: "Instagram",
    authUrl: "https://www.facebook.com/v19.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v19.0/oauth/access_token",
    scopes: [
      "instagram_basic",
      "instagram_content_publish",
      "pages_read_engagement",
    ],
    envClientId: "INSTAGRAM_CLIENT_ID",
    envClientSecret: "INSTAGRAM_CLIENT_SECRET",
  },
  twitter: {
    label: "Twitter / X",
    authUrl: "https://twitter.com/i/oauth2/authorize",
    tokenUrl: "https://api.twitter.com/2/oauth2/token",
    scopes: ["tweet.read", "tweet.write", "users.read", "offline.access"],
    envClientId: "TWITTER_CLIENT_ID",
    envClientSecret: "TWITTER_CLIENT_SECRET",
  },
};

export function getOAuthUrl(
  platform: SocialPlatform,
  redirectUri: string,
  state: string
): string {
  const config = platformConfigs[platform];
  const clientId = process.env[config.envClientId];
  if (!clientId) throw new Error(`Missing env var ${config.envClientId}`);

  const params = new URLSearchParams({
    client_key: clientId,
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: config.scopes.join(","),
    state,
  });

  return `${config.authUrl}?${params}`;
}

export async function exchangeCode(
  platform: SocialPlatform,
  code: string,
  redirectUri: string
): Promise<{ access_token: string; refresh_token?: string; expires_in?: number }> {
  const config = platformConfigs[platform];
  const clientId = process.env[config.envClientId];
  const clientSecret = process.env[config.envClientSecret];
  if (!clientId || !clientSecret) {
    throw new Error(`Missing env vars for ${platform}`);
  }

  const res = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      client_key: clientId,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed for ${platform}: ${text}`);
  }

  return res.json();
}

export async function publishToTikTok(accessToken: string, videoPath: string, title: string) {
  // TikTok Video Upload API - two-step process: init upload, then upload file
  throw new Error("TikTok publishing requires completing the app review process. Configure TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET.");
}

export async function publishToYouTube(accessToken: string, videoPath: string, title: string, description: string) {
  throw new Error("YouTube publishing requires a Google Cloud project with YouTube Data API v3. Configure YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET.");
}

export async function publishToInstagram(accessToken: string, videoPath: string, caption: string) {
  throw new Error("Instagram publishing requires a Meta Business app. Configure INSTAGRAM_CLIENT_ID and INSTAGRAM_CLIENT_SECRET.");
}

export async function publishToTwitter(accessToken: string, videoPath: string, text: string) {
  throw new Error("Twitter publishing requires a developer account with elevated access. Configure TWITTER_CLIENT_ID and TWITTER_CLIENT_SECRET.");
}
