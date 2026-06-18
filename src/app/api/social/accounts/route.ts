import { NextResponse } from "next/server";
import { getSocialAccounts } from "@/lib/db";

export async function GET() {
  // Never expose access_token to the client — only connection status + username
  const accounts = (getSocialAccounts() as Record<string, unknown>[]).map((a) => ({
    platform: a.platform,
    connected: Boolean(a.connected),
    username: a.username ?? null,
  }));
  return NextResponse.json(accounts);
}
