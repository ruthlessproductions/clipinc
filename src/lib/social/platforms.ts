import type { SocialPlatform } from "../types";
import fs from "fs";
import path from "path";

interface PlatformConfig {
  label: string;
  authUrl: string;
  tokenUrl: string;
  scopes: string[];
  envClientId: string;
  envClientSecret: string;
}

// Read TikTok credentials at call time based on TIKTOK_ENV
function getTikTokCredentials() {
  const env = (process.env.TIKTOK_ENV ?? "sandbox").toLowerCase();
  const clientId =
    env === "production"
      ? (process.env.TIKTOK_CLIENT_KEY_PRODUCTION ?? process.env.TIKTOK_CLIENT_KEY)
      : (process.env.TIKTOK_CLIENT_KEY_SANDBOX    ?? process.env.TIKTOK_CLIENT_KEY);
  const clientSecret =
    env === "production"
      ? (process.env.TIKTOK_CLIENT_SECRET_PRODUCTION ?? process.env.TIKTOK_CLIENT_SECRET)
      : (process.env.TIKTOK_CLIENT_SECRET_SANDBOX    ?? process.env.TIKTOK_CLIENT_SECRET);
  if (!clientId)     throw new Error(`Missing TikTok client key for env "${env}". Set TIKTOK_CLIENT_KEY_${env.toUpperCase()} in .env.local`);
  if (!clientSecret) throw new Error(`Missing TikTok client secret for env "${env}". Set TIKTOK_CLIENT_SECRET_${env.toUpperCase()} in .env.local`);
  return { clientId, clientSecret };
}

export const platformConfigs: Record<SocialPlatform, PlatformConfig> = {
  tiktok: {
    label: "TikTok",
    authUrl: "https://www.tiktok.com/v2/auth/authorize/",
    tokenUrl: "https://open.tiktokapis.com/v2/oauth/token/",
    scopes: ["user.info.basic", "user.info.profile", "video.publish", "video.upload"],
    envClientId: "TIKTOK_CLIENT_KEY",       // unused for tiktok — getTikTokCredentials() is called directly
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
  state: string,
  extra: Record<string, string> = {}
): string {
  const config = platformConfigs[platform];
  const clientId = platform === "tiktok"
    ? getTikTokCredentials().clientId
    : process.env[config.envClientId];
  if (!clientId) throw new Error(`Missing env var ${config.envClientId}`);

  const base: Record<string, string> = {
    redirect_uri: redirectUri,
    response_type: "code",
    state,
    ...extra,
  };

  if (platform === "tiktok") {
    base.client_key = clientId;
    base.scope = config.scopes.join(",");
  } else if (platform === "youtube") {
    base.client_id = clientId;
    base.scope = config.scopes.join(" ");
    base.access_type = "offline";
    base.prompt = "consent";
  } else {
    base.client_id = clientId;
    base.scope = config.scopes.join(" ");
  }

  return `${config.authUrl}?${new URLSearchParams(base)}`;
}

export async function exchangeCode(
  platform: SocialPlatform,
  code: string,
  redirectUri: string,
  codeVerifier?: string
): Promise<{ access_token: string; refresh_token?: string; expires_in?: number }> {
  const config = platformConfigs[platform];
  let clientId: string | undefined;
  let clientSecret: string | undefined;
  if (platform === "tiktok") {
    ({ clientId, clientSecret } = getTikTokCredentials());
  } else {
    clientId = process.env[config.envClientId];
    clientSecret = process.env[config.envClientSecret];
    if (!clientId || !clientSecret) throw new Error(`Missing env vars for ${platform}`);
  }

  const body: Record<string, string> = {
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
  };
  if (platform === "tiktok") {
    body.client_key = clientId;
    body.client_secret = clientSecret;
    if (codeVerifier) body.code_verifier = codeVerifier;
    console.log("[TikTok token exchange] verifier present:", !!codeVerifier, "verifier:", codeVerifier?.slice(0, 20));
  } else {
    body.client_id = clientId;
    body.client_secret = clientSecret;
  }

  const res = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed for ${platform}: ${text}`);
  }

  const json = await res.json();
  console.log(`[exchangeCode:${platform}] raw response:`, JSON.stringify(json));

  // TikTok returns 200 even for errors; tokens may be at root OR nested in `data`
  if (platform === "tiktok") {
    if (json.error && json.error !== "ok") {
      throw new Error(`TikTok token exchange failed: ${json.error_description ?? json.error}`);
    }
    // Sandbox returns tokens at root; production wraps them in `data`
    const tokenData = json.data ?? json;
    if (!tokenData.access_token) {
      throw new Error(`TikTok token exchange: no access_token in response: ${JSON.stringify(json)}`);
    }
    return {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_in: tokenData.expires_in,
    };
  }

  return json;
}

// ─── Platform publish implementations ────────────────────────────────────────

export interface PublishResult {
  url?: string;
  id?: string;
}

/**
 * YouTube: resumable upload to YouTube Data API v3.
 * Requires YOUTUBE_CLIENT_ID + YOUTUBE_CLIENT_SECRET in .env.local and
 * a Google Cloud project with YouTube Data API v3 enabled.
 * Shorts are detected automatically by YouTube when the video is ≤60 s and vertical.
 */
export async function publishToYouTube(
  accessToken: string,
  videoPath: string,
  title: string,
  description: string
): Promise<PublishResult> {
  const stat = fs.statSync(videoPath);
  const fileSize = stat.size;
  const ext = path.extname(videoPath).slice(1).toLowerCase();
  const mimeType = ext === "webm" ? "video/webm" : "video/mp4";

  // 1. Initiate a resumable upload session
  const initRes = await fetch(
    "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Upload-Content-Type": mimeType,
        "X-Upload-Content-Length": String(fileSize),
      },
      body: JSON.stringify({
        snippet: {
          title: title.slice(0, 100),
          description,
          tags: ["shorts", "clipinc"],
          categoryId: "22", // People & Blogs
        },
        status: {
          privacyStatus: "public",
          selfDeclaredMadeForKids: false,
        },
      }),
    }
  );

  if (!initRes.ok) {
    const text = await initRes.text();
    throw new Error(`YouTube session init failed: ${text}`);
  }

  const uploadUrl = initRes.headers.get("Location");
  if (!uploadUrl) throw new Error("YouTube did not return an upload URL");

  // 2. Upload the video file
  const videoBuffer = fs.readFileSync(videoPath);
  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": mimeType,
      "Content-Length": String(fileSize),
    },
    body: videoBuffer,
  });

  if (!uploadRes.ok && uploadRes.status !== 201) {
    const text = await uploadRes.text();
    throw new Error(`YouTube upload failed (${uploadRes.status}): ${text}`);
  }

  const data = await uploadRes.json();
  return {
    id: data.id,
    url: `https://www.youtube.com/shorts/${data.id}`,
  };
}

/**
 * TikTok: Content Posting API v2 (file upload mode).
 * Requires TIKTOK_CLIENT_KEY + TIKTOK_CLIENT_SECRET in .env.local.
 * App must have "Content Posting API" permission approved in TikTok developer portal.
 * Clips upload as SELF_ONLY drafts by default — change privacy_level if desired.
 */
export async function publishToTikTok(
  accessToken: string,
  videoPath: string,
  title: string
): Promise<PublishResult> {
  const stat = fs.statSync(videoPath);
  const fileSize = stat.size;

  // 1. Initialise the upload — use inbox/draft endpoint so it works in sandbox
  //    and before Content Posting API is fully approved for production.
  //    The video lands in the creator's TikTok inbox as a draft to review & post.
  const initRes = await fetch(
    "https://open.tiktokapis.com/v2/post/publish/inbox/video/init/",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify({
        source_info: {
          source: "FILE_UPLOAD",
          video_size: fileSize,
          chunk_size: fileSize, // single chunk (≤64 MB clips)
          total_chunk_count: 1,
        },
      }),
    }
  );

  const initData = await initRes.json();
  console.log("[TikTok publish init]", JSON.stringify(initData));
  if (initData.error?.code !== "ok") {
    throw new Error(`TikTok init failed: ${initData.error?.message ?? JSON.stringify(initData)}`);
  }

  const { upload_url, publish_id } = initData.data as { upload_url: string; publish_id: string };

  // 2. Upload the video
  const videoBuffer = fs.readFileSync(videoPath);
  const uploadRes = await fetch(upload_url, {
    method: "PUT",
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": String(fileSize),
      "Content-Range": `bytes 0-${fileSize - 1}/${fileSize}`,
    },
    body: videoBuffer,
  });

  if (!uploadRes.ok) {
    throw new Error(`TikTok upload failed (${uploadRes.status}): ${await uploadRes.text()}`);
  }

  return { id: publish_id };
}

/**
 * Instagram Reels: two-step container → publish flow via Graph API.
 * Requires INSTAGRAM_CLIENT_ID + INSTAGRAM_CLIENT_SECRET in .env.local.
 * The video must be reachable at a PUBLIC URL — set APP_PUBLIC_URL in .env.local
 * (e.g. your ngrok tunnel) so Instagram's servers can download it.
 * Requires a professional/creator Instagram account linked to a Facebook Page.
 */
export async function publishToInstagram(
  accessToken: string,
  clipId: string,
  caption: string
): Promise<PublishResult> {
  const publicUrl = process.env.APP_PUBLIC_URL;
  if (!publicUrl) {
    throw new Error(
      "Set APP_PUBLIC_URL in .env.local to your public server URL so Instagram can download the video (e.g. https://abc123.ngrok.io)"
    );
  }
  const videoUrl = `${publicUrl}/api/clips/${clipId}/download`;

  // 1. Get the Instagram Business Account ID from the token
  const meRes = await fetch(
    `https://graph.facebook.com/v19.0/me/accounts?fields=instagram_business_account&access_token=${accessToken}`
  );
  const meData = await meRes.json();
  const igAccountId = meData?.data?.[0]?.instagram_business_account?.id as string | undefined;
  if (!igAccountId) {
    throw new Error("Could not find an Instagram Business Account linked to this token. Make sure your Instagram is set to Professional and linked to a Facebook Page.");
  }

  // 2. Create the media container
  const containerRes = await fetch(
    `https://graph.facebook.com/v19.0/${igAccountId}/media`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        media_type: "REELS",
        video_url: videoUrl,
        caption,
        share_to_feed: true,
        access_token: accessToken,
      }),
    }
  );
  const containerData = await containerRes.json();
  if (!containerData.id) {
    throw new Error(`Instagram container creation failed: ${JSON.stringify(containerData)}`);
  }

  // 3. Wait for the container to finish processing (poll up to ~30 s)
  let ready = false;
  for (let attempt = 0; attempt < 10; attempt++) {
    await new Promise(r => setTimeout(r, 3000));
    const statusRes = await fetch(
      `https://graph.facebook.com/v19.0/${containerData.id}?fields=status_code&access_token=${accessToken}`
    );
    const statusData = await statusRes.json();
    if (statusData.status_code === "FINISHED") { ready = true; break; }
    if (statusData.status_code === "ERROR") {
      throw new Error(`Instagram media processing failed: ${JSON.stringify(statusData)}`);
    }
  }
  if (!ready) throw new Error("Instagram media processing timed out");

  // 4. Publish
  const publishRes = await fetch(
    `https://graph.facebook.com/v19.0/${igAccountId}/media_publish`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creation_id: containerData.id, access_token: accessToken }),
    }
  );
  const publishData = await publishRes.json();
  if (!publishData.id) {
    throw new Error(`Instagram publish failed: ${JSON.stringify(publishData)}`);
  }

  return { id: publishData.id };
}

/**
 * Twitter / X: chunked media upload + tweet creation.
 * Requires TWITTER_CLIENT_ID + TWITTER_CLIENT_SECRET in .env.local.
 * Note: media upload requires Basic tier ($100/month) or Elevated access on
 * Twitter's developer portal. Free tier only supports text tweets.
 */
export async function publishToTwitter(
  accessToken: string,
  videoPath: string,
  text: string
): Promise<PublishResult> {
  const stat = fs.statSync(videoPath);
  const totalBytes = stat.size;
  const CHUNK_SIZE = 5 * 1024 * 1024; // 5 MB chunks

  const authHeader = `Bearer ${accessToken}`;

  // 1. INIT
  const initRes = await fetch("https://upload.twitter.com/1.1/media/upload.json", {
    method: "POST",
    headers: { Authorization: authHeader, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      command: "INIT",
      total_bytes: String(totalBytes),
      media_type: "video/mp4",
      media_category: "tweet_video",
    }),
  });
  if (!initRes.ok) {
    const text = await initRes.text();
    throw new Error(`Twitter INIT failed: ${text}`);
  }
  const { media_id_string } = await initRes.json() as { media_id_string: string };

  // 2. APPEND in chunks
  const fd = fs.openSync(videoPath, "r");
  let segmentIndex = 0;
  let bytesRead = 0;
  const chunk = Buffer.alloc(CHUNK_SIZE);
  while (bytesRead < totalBytes) {
    const read = fs.readSync(fd, chunk, 0, CHUNK_SIZE, bytesRead);
    const slice = chunk.slice(0, read);
    const form = new FormData();
    form.append("command", "APPEND");
    form.append("media_id", media_id_string);
    form.append("segment_index", String(segmentIndex));
    form.append("media", new Blob([slice], { type: "video/mp4" }));
    const appendRes = await fetch("https://upload.twitter.com/1.1/media/upload.json", {
      method: "POST",
      headers: { Authorization: authHeader },
      body: form,
    });
    if (!appendRes.ok) throw new Error(`Twitter APPEND ${segmentIndex} failed: ${await appendRes.text()}`);
    bytesRead += read;
    segmentIndex++;
  }
  fs.closeSync(fd);

  // 3. FINALIZE
  const finalRes = await fetch("https://upload.twitter.com/1.1/media/upload.json", {
    method: "POST",
    headers: { Authorization: authHeader, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ command: "FINALIZE", media_id: media_id_string }),
  });
  if (!finalRes.ok) throw new Error(`Twitter FINALIZE failed: ${await finalRes.text()}`);

  // 4. Create tweet
  const tweetRes = await fetch("https://api.twitter.com/2/tweets", {
    method: "POST",
    headers: { Authorization: authHeader, "Content-Type": "application/json" },
    body: JSON.stringify({ text, media: { media_ids: [media_id_string] } }),
  });
  if (!tweetRes.ok) throw new Error(`Twitter tweet creation failed: ${await tweetRes.text()}`);
  const tweetData = await tweetRes.json() as { data: { id: string } };

  return {
    id: tweetData.data.id,
    url: `https://twitter.com/i/web/status/${tweetData.data.id}`,
  };
}
