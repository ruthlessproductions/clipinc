import { NextResponse } from "next/server";
import { getProject, getClips, mapProject, mapClip } from "@/lib/db";
import db from "@/lib/db";

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

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  // Clips and their captions cascade-delete via foreign keys
  db.prepare("DELETE FROM projects WHERE id = ?").run(id);
  return NextResponse.json({ success: true });
}
