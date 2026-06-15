import { NextResponse } from "next/server";
import { getProject, getClips, mapProject, mapClip } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const clips = (getClips(id) as Record<string, unknown>[]).map(mapClip);
  return NextResponse.json(mapProject(project, clips));
}
