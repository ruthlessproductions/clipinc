import { NextResponse } from "next/server";
import { updateSocialAccount } from "@/lib/db";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ platform: string }> }
) {
  const { platform } = await params;
  updateSocialAccount(platform, {
    connected: 0,
    username: undefined,
    access_token: undefined,
    refresh_token: undefined,
    expires_at: undefined,
  });
  return NextResponse.json({ success: true });
}
