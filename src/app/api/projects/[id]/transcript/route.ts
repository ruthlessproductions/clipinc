import { NextResponse } from "next/server";
import fs from "fs";
import { getProject, updateProject } from "@/lib/db";
import { transcriptPath, saveUploadedFile } from "@/lib/storage";


export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const contentType = req.headers.get("content-type") || "";

  let transcriptText: string;

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const file = formData.get("transcript") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No transcript file provided" }, { status: 400 });
    }

    const dest = transcriptPath(id);
    await saveUploadedFile(file, dest);
    transcriptText = fs.readFileSync(dest, "utf-8");
  } else {
    const body = await req.json();
    transcriptText = body.text;
    if (!transcriptText) {
      return NextResponse.json({ error: "No transcript text provided" }, { status: 400 });
    }
    fs.writeFileSync(transcriptPath(id), transcriptText);
  }

  // Store raw transcript — compressTranscript in llm.ts handles timecode parsing
  updateProject(id, {
    transcript: transcriptText,
    processing_step: "transcribing",
    processing_progress: 25,
  });

  return NextResponse.json({ success: true, length: transcriptText.length });
}

