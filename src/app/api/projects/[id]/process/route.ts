import { NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import fs from "fs";
import { getProject, updateProject, createClip } from "@/lib/db";
import { transcriptPath } from "@/lib/storage";
import { getVideoDuration } from "@/lib/ffmpeg";
import { detectHighlights, checkOmlxHealth } from "@/lib/llm";

async function runAnalysis(id: string, transcript: string, duration: number) {
  try {
    updateProject(id, { processing_step: "analyzing", processing_progress: 50, status_message: "Starting analysis…" });

    const highlights = await detectHighlights(
      transcript,
      duration || 3600,
      (message, progress) => updateProject(id, { status_message: message, processing_progress: progress })
    );

    updateProject(id, { processing_step: "generating", processing_progress: 75, status_message: "Generating clips…" });

    for (const h of highlights) {
      createClip({
        id: uuid(),
        project_id: id,
        title: h.title,
        description: h.description,
        start_time: h.start_time,
        end_time: h.end_time,
        duration: h.end_time - h.start_time,
        score: h.score,
      });
    }

    updateProject(id, { processing_step: "complete", processing_progress: 100, status_message: null });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    updateProject(id, {
      processing_step: "transcribing",
      processing_progress: 25,
      status_message: `Error: ${message}`,
    });
  }
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const filePath = project.file_path as string | null;

  // Step 1: Get video duration
  let duration = project.duration as number;
  if (filePath && duration === 0) {
    try {
      duration = await getVideoDuration(filePath);
      updateProject(id, { duration, processing_step: "transcribing", processing_progress: 20 });
    } catch {
      return NextResponse.json({ error: "Failed to read video file. Is ffmpeg installed?" }, { status: 500 });
    }
  }

  // Step 2: Check for transcript
  let transcript = project.transcript as string | null;

  if (!transcript) {
    const tPath = transcriptPath(id);
    if (fs.existsSync(tPath)) {
      transcript = fs.readFileSync(tPath, "utf-8");
      updateProject(id, { transcript });
    }
  }

  if (!transcript) {
    updateProject(id, { processing_step: "transcribing", processing_progress: 25 });
    return NextResponse.json({
      error: "No transcript available. Upload a transcript file or paste the text.",
      needs_transcript: true,
    }, { status: 422 });
  }

  // Step 3: Check oMLX is reachable before firing off the background job
  const omlxUp = await checkOmlxHealth();
  if (!omlxUp) {
    return NextResponse.json({
      error: "oMLX server not reachable. Start oMLX and ensure it's running at " + (process.env.OMLX_URL || "http://localhost:8000"),
      needs_omlx: true,
    }, { status: 503 });
  }

  // Step 4: Fire off analysis in background — don't await so the response
  // returns immediately and the client polls for state changes.
  runAnalysis(id, transcript, duration);

  return NextResponse.json({ started: true });
}
