import { NextResponse } from "next/server";
import fs from "fs";
import { getClip, getProject, updateClip, getCaptions } from "@/lib/db";
import { extractClip, generateThumbnail } from "@/lib/ffmpeg";
import { generateASSContent, writeTempASS } from "@/lib/captions";
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
  const captionStyle: string | null = body.caption_style ?? null;

  // Build ASS subtitle file if a caption style was requested
  let assPath: string | undefined;
  if (captionStyle) {
    const rawCaptions = getCaptions(id) as { text: string; start_time: number; end_time: number }[];
    if (rawCaptions.length > 0) {
      const captions = rawCaptions.map((c) => ({
        id: "",
        text: c.text,
        startTime: c.start_time,
        endTime: c.end_time,
      }));
      const assContent = generateASSContent(captions, clip.start_time as number, captionStyle);
      if (assContent) assPath = writeTempASS(assContent);
    }
  }

  try {
    const clipFilePath = await extractClip(
      project.file_path as string,
      id,
      clip.start_time as number,
      clip.end_time as number,
      aspectRatio,
      assPath
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

    // Clean up temp ASS file
    if (assPath) {
      try { fs.unlinkSync(assPath); } catch {}
    }

    return NextResponse.json({ success: true, file_path: clipFilePath });
  } catch (e: unknown) {
    if (assPath) {
      try { fs.unlinkSync(assPath); } catch {}
    }
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: `Export failed: ${message}. Is ffmpeg installed?` },
      { status: 500 }
    );
  }
}
