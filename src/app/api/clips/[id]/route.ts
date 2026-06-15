import { NextResponse } from "next/server";
import { getClip, updateClip, getCaptions, setCaptions } from "@/lib/db";

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

  const { captions, ...clipData } = body;

  if (Object.keys(clipData).length > 0) {
    updateClip(id, clipData);
  }

  if (captions) {
    setCaptions(id, captions);
  }

  return NextResponse.json({ success: true });
}
