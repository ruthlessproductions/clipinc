import { NextResponse } from "next/server";
import fs from "fs";
import { getClip, getProject, updateClip, getCaptions } from "@/lib/db";
import { extractClip, generateThumbnail } from "@/lib/ffmpeg";
import { generateASSContent } from "@/lib/captions";
import os from "os";
import path from "path";
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
  const captionFont: string | undefined = body.caption_font || undefined;
  // caption_position is 0-100 % from bottom; convert to ASS MarginV pixels (PlayResY = 1920)
  const captionPosition: number | null = body.caption_position != null ? Number(body.caption_position) : null;
  const marginVOverride = captionPosition != null ? Math.round((captionPosition / 100) * 1920) : undefined;

  // If the clip has no valid time range (LLM output was 0), derive from captions
  let clipStart = clip.start_time as number;
  let clipEnd = clip.end_time as number;
  if (clipEnd <= clipStart) {
    const allCaptions = getCaptions(id) as { start_time: number; end_time: number }[];
    if (allCaptions.length > 0) {
      clipStart = allCaptions[0].start_time;
      clipEnd = allCaptions[allCaptions.length - 1].end_time;
      updateClip(id, { start_time: clipStart, end_time: clipEnd, duration: clipEnd - clipStart });
    }
  }
  if (clipEnd <= clipStart) {
    return NextResponse.json({ error: "Clip has no valid time range" }, { status: 422 });
  }

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
      const assContent = generateASSContent(captions, clipStart, captionStyle, marginVOverride, captionFont);
      if (assContent) {
        assPath = path.join(os.tmpdir(), `clipinc-${Date.now()}.ass`);
        fs.writeFileSync(assPath, assContent, "utf8");
      }
    }
  }

  try {
    const clipFilePath = await extractClip(
      project.file_path as string,
      id,
      clipStart,
      clipEnd,
      aspectRatio,
      assPath
    );

    await generateThumbnail(
      project.file_path as string,
      id,
      clipStart
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
