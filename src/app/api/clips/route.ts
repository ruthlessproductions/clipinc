import { NextResponse } from "next/server";
import { getClips } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId") ?? undefined;
  return NextResponse.json(getClips(projectId));
}
