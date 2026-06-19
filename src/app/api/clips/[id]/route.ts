import { NextResponse } from "next/server";
import { getClip, updateClip, getCaptions, setCaptions } from "@/lib/db";
import db from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const clip = getClip(id);
  if (!clip) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const captions = getCaptions(id);
  return NextResponse.json({ ...clip, captions });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const { captions, ...rest } = body;

  const FIELD_MAP: Record<string, string> = {
    startTime: "start_time",
    endTime: "end_time",
    aspectRatio: "aspect_ratio",
    projectId: "project_id",
    publishedTo: "published_to",
    createdAt: "created_at",
  };

  const clipData = Object.fromEntries(
    Object.entries(rest).map(([k, v]) => [FIELD_MAP[k] ?? k, v])
  );

  if (Object.keys(clipData).length > 0) {
    updateClip(id, clipData);
  }

  if (captions) {
    // Normalize camelCase from client to snake_case for DB
    const normalized = captions.map((c: Record<string, unknown>) => ({
      id: c.id as string,
      text: c.text as string,
      start_time: (c.start_time ?? c.startTime) as number,
      end_time: (c.end_time ?? c.endTime) as number,
    }));
    setCaptions(id, normalized);
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  db.prepare("DELETE FROM clips WHERE id = ?").run(id);
  return NextResponse.json({ success: true });
}
