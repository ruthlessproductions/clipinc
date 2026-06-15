import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getClip } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const clip = getClip(id) as Record<string, unknown> | undefined;

  if (!clip) {
    return NextResponse.json({ error: "Clip not found" }, { status: 404 });
  }

  const filePath = clip.file_path as string | null;
  if (!filePath || !fs.existsSync(filePath)) {
    return NextResponse.json(
      { error: "Clip file not found. Export the clip first." },
      { status: 404 }
    );
  }

  const buffer = fs.readFileSync(filePath);
  const fileName = path.basename(filePath);

  return new Response(buffer, {
    headers: {
      "Content-Type": "video/mp4",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Length": buffer.length.toString(),
    },
  });
}
