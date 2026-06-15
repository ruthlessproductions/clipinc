import path from "path";
import fs from "fs";

const STORAGE_ROOT = path.join(process.cwd(), "storage");

export const dirs = {
  videos: path.join(STORAGE_ROOT, "videos"),
  clips: path.join(STORAGE_ROOT, "clips"),
  thumbnails: path.join(STORAGE_ROOT, "thumbnails"),
  transcripts: path.join(STORAGE_ROOT, "transcripts"),
};

for (const dir of Object.values(dirs)) {
  fs.mkdirSync(dir, { recursive: true });
}

export function videoPath(projectId: string, ext: string) {
  return path.join(dirs.videos, `${projectId}${ext}`);
}

export function clipPath(clipId: string, ext = ".mp4") {
  return path.join(dirs.clips, `${clipId}${ext}`);
}

export function thumbnailPath(clipId: string) {
  return path.join(dirs.thumbnails, `${clipId}.jpg`);
}

export function transcriptPath(projectId: string) {
  return path.join(dirs.transcripts, `${projectId}.txt`);
}

export async function saveUploadedFile(
  file: File,
  destPath: string
): Promise<void> {
  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(destPath, buffer);
}
