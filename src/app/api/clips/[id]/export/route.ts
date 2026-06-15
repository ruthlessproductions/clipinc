import { NextResponse } from "next/server";
import fs from "fs";
import { getClip, getProject, updateClip } from "@/lib/db";
import { extractClip, generateThumbnail } from "@/lib/ffmpeg";
import type { AspectRatio } from "@/lib/types";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const clip = getClip(id);
  if (!clip) {
    return NextResponse.json({ error: "Clip not found" }, { status: 404 });
  }

  const project = getProject(clip.project_id as string);
  if (!project?.file_path) {
    return NextResponse.json(
      { error: "Source video not found. Video file is required for export." },
      { status: 422 }
    );
  }

  if (!fs.existsSync(project.file_path as string)) {
    return NextResponse.json(
      { error: "Source video file missing from disk" },
      { status: 404 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const aspectRatio = (body.aspect_ratio || clip.aspect_ratio || "9:16") as AspectRatio;

  try {
    const clipFilePath = await extractClip(
      project.file_path as string,
      id,
      clip.start_time as number,
      clip.end_time as number,
      aspectRatio
    );

    await generateThumbnail(
      project.file_path as string,
      id,
      clip.start_time as number
    );

    updateClip(id, {
      status: "exported",
      aspect_ratio: aspectRatio,
      file_path: clipFilePath,
    });

    return NextResponse.json({ success: true, file_path: clipFilePath });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: `Export failed: ${message}. Is ffmpeg installed?` },
      { status: 500 }
    );
  }
}
