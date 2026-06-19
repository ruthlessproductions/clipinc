import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";
import { clipPath, thumbnailPath } from "./storage";
import type { AspectRatio } from "./types";

if (process.env.FFMPEG_PATH) ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH);

const ASPECT_FILTERS: Record<AspectRatio, string> = {
  "9:16": "crop=ih*9/16:ih,scale=1080:1920",
  "1:1": "crop=min(iw\\,ih):min(iw\\,ih),scale=1080:1080",
  "16:9": "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2",
};

export function getVideoDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);
      resolve(metadata.format.duration ?? 0);
    });
  });
}

function buildCommand(
  sourcePath: string,
  outPath: string,
  startTime: number,
  duration: number,
  filterChain: string
) {
  return ffmpeg(sourcePath)
    .inputOptions(["-ss", String(startTime)])
    .setDuration(duration)
    .videoFilters(filterChain)
    .outputOptions([
      "-c:v", "libx264",
      "-preset", "ultrafast",
      "-crf", "23",
      "-pix_fmt", "yuv420p",
      "-c:a", "aac",
      "-b:a", "128k",
      "-movflags", "+faststart",
    ])
    .output(outPath);
}

export async function extractClip(
  sourcePath: string,
  clipId: string,
  startTime: number,
  endTime: number,
  aspectRatio: AspectRatio = "9:16",
  assPath?: string
): Promise<string> {
  const outPath = clipPath(clipId);
  const duration = endTime - startTime;
  const baseFilter = ASPECT_FILTERS[aspectRatio];

  const logPath = path.join(path.dirname(outPath), "ffmpeg-debug.log");
  let lastStderr: string[] = [];
  const run = (filterChain: string) =>
    new Promise<void>((resolve, reject) => {
      lastStderr = [];
      buildCommand(sourcePath, outPath, startTime, duration, filterChain)
        .on("stderr", (line: string) => lastStderr.push(line))
        .on("end", resolve)
        .on("error", (err: Error) => reject(err))
        .run();
    });

  if (assPath) {
    const escaped = assPath.replace(/\\/g, "\\\\").replace(/:/g, "\\:").replace(/'/g, "\\'");
    try {
      await run(`${baseFilter},ass=${escaped}`);
      const size = fs.existsSync(outPath) ? fs.statSync(outPath).size : 0;
      if (size > 50_000) return outPath;
      fs.writeFileSync(logPath, lastStderr.join("\n"), "utf8");
    } catch (err) {
      fs.writeFileSync(logPath, lastStderr.join("\n"), "utf8");
    }
  }

  await run(baseFilter);
  return outPath;
}

export function generateThumbnail(
  sourcePath: string,
  clipId: string,
  timestamp: number
): Promise<string> {
  const outPath = thumbnailPath(clipId);

  return new Promise((resolve, reject) => {
    ffmpeg(sourcePath)
      .setStartTime(timestamp)
      .frames(1)
      .outputOptions(["-vf", "scale=480:-1"])
      .output(outPath)
      .on("end", () => resolve(outPath))
      .on("error", reject)
      .run();
  });
}

export function extractAudio(videoPath: string, outPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .noVideo()
      .audioCodec("pcm_s16le")
      .audioFrequency(16000)
      .audioChannels(1)
      .output(outPath)
      .on("end", () => resolve(outPath))
      .on("error", reject)
      .run();
  });
}
