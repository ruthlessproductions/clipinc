import { NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import type { SocialPlatform } from "@/lib/types";
import { getOAuthUrl, exchangeCode } from "@/lib/social/platforms";
import { updateSocialAccount } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ platform: string }> }
) {
  const { platform } = await params;
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const baseUrl = `${new URL(req.url).origin}/api/social/${platform}/connect`;

  if (code) {
    try {
      const tokens = await exchangeCode(platform as SocialPlatform, code, baseUrl);
      const expiresAt = tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
        : undefined;

      updateSocialAccount(platform, {
        connected: 1,
        username: `@${platform}_user`,
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

  try {
    const state = uuid();
    const authUrl = getOAuthUrl(platform as SocialPlatform, baseUrl, state);
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
