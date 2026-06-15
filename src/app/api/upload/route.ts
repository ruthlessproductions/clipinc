import { NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import path from "path";
import { createProject, updateProject } from "@/lib/db";
import { videoPath, saveUploadedFile } from "@/lib/storage";

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("video") as File | null;
  const url = formData.get("url") as string | null;

  if (!file && !url) {
    return NextResponse.json({ error: "Provide a video file or URL" }, { status: 400 });
  }

  const id = uuid();

  if (file) {
    const ext = path.extname(file.name) || ".mp4";
    const dest = videoPath(id, ext);

    createProject({
      id,
      title: file.name.replace(/\.[^.]+$/, ""),
      file_name: file.name,
      file_path: dest,
    });

    await saveUploadedFile(file, dest);

    updateProject(id, {
      processing_step: "transcribing",
      processing_progress: 25,
    });
  } else if (url) {
    createProject({
      id,
      title: "Imported Video",
      source_url: url,
    });
  }

  return NextResponse.json({ id });
}
