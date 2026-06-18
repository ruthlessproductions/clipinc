import { NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
// opaqueState: purely alphanumeric so no platform can strip special chars from it
function opaqueState() { return randomBytes(16).toString("hex"); }
import { randomBytes, createHash } from "crypto";
import type { SocialPlatform } from "@/lib/types";
import { getOAuthUrl, exchangeCode } from "@/lib/social/platforms";
import { updateSocialAccount, storePkceVerifier, consumePkceVerifier } from "@/lib/db";

// ── Fetch real username after OAuth ─────────────────────────────────────────

async function fetchUsername(platform: SocialPlatform, accessToken: string): Promise<string> {
  try {
    if (platform === "tiktok") {
      const res = await fetch(
        "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,username",
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const data = await res.json();
      console.log("[TikTok userinfo]", JSON.stringify(data));
      const user = data?.data?.user;
      const name = user?.username ?? user?.display_name;
      return name ? `@${name}` : "@tiktok_user";
    }

    if (platform === "youtube") {
      const res = await fetch(
        "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true",
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const data = await res.json();
      return data?.items?.[0]?.snippet?.title ?? "YouTube User";
    }

    if (platform === "instagram") {
      const res = await fetch(
        `https://graph.facebook.com/v19.0/me?fields=name&access_token=${accessToken}`
      );
      const data = await res.json();
      return data?.name ?? "Instagram User";
    }

    if (platform === "twitter") {
      const res = await fetch("https://api.twitter.com/2/users/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      return data?.data?.username ? `@${data.data.username}` : "@twitter_user";
    }
  } catch {
    // fall through to default
  }
  return `@${platform}_user`;
}

// ── PKCE helpers — TikTok uses non-standard hex challenge (not base64url) ───
// Reference: https://developers.tiktok.com/doc/login-kit-manage-user-access-tokens

const VERIFIER_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

function generateCodeVerifier(): string {
  // 60-char alphanumeric string, matching TikTok's own sample code
  const bytes = randomBytes(60);
  return Array.from(bytes)
    .map((b) => VERIFIER_CHARS[b % VERIFIER_CHARS.length])
    .join("");
}

function generateCodeChallenge(verifier: string): string {
  // TikTok encodes the challenge as a lowercase hex string, NOT base64url
  return createHash("sha256").update(verifier, "utf8").digest("hex");
}

// ────────────────────────────────────────────────────────────────────────────

export async function GET(
  req: Request,
  { params }: { params: Promise<{ platform: string }> }
) {
  const { platform } = await params;
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const redirectUri = `${new URL(req.url).origin}/api/social/${platform}/connect`;

  // ── Callback: exchange code for tokens ──────────────────────────────────
  if (code) {
    try {
      const state = searchParams.get("state") ?? "";
      // Look up the PKCE verifier from the DB using the state ID
      const codeVerifier = platform === "tiktok" ? consumePkceVerifier(state) : undefined;
      console.log("[TikTok callback] state:", state);
      console.log("[TikTok callback] verifier from DB:", codeVerifier ?? "(not found)");

      const tokens = await exchangeCode(
        platform as SocialPlatform,
        code,
        redirectUri,
        codeVerifier
      );
      const expiresAt = tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
        : undefined;

      const username = await fetchUsername(platform as SocialPlatform, tokens.access_token);

      updateSocialAccount(platform, {
        connected: 1,
        username,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: expiresAt,
      });

      return NextResponse.redirect(new URL("/settings?connected=" + platform, req.url));
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  // ── Initial redirect: build auth URL ────────────────────────────────────
  try {
    const state = platform === "tiktok" ? opaqueState() : uuid();
    let authUrl: string;

    if (platform === "tiktok") {
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = generateCodeChallenge(codeVerifier);
      // Store verifier in DB keyed by state UUID — retrieved in callback
      storePkceVerifier(state, codeVerifier);
      console.log("[TikTok init] state:", state);
      console.log("[TikTok init] verifier:", codeVerifier);
      console.log("[TikTok init] challenge:", codeChallenge);
      authUrl = getOAuthUrl(platform as SocialPlatform, redirectUri, state, {
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
      });
      return NextResponse.redirect(authUrl);
    }

    authUrl = getOAuthUrl(platform as SocialPlatform, redirectUri, state);
    return NextResponse.redirect(authUrl);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      {
        error: message,
        help: `Set the environment variables for ${platform} OAuth credentials. See .env.example for details.`,
      },
      { status: 500 }
    );
  }
}
