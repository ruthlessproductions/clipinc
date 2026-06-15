import ffmpeg from "fluent-ffmpeg";
import path from "path";
import { clipPath, thumbnailPath } from "./storage";
import type { AspectRatio } from "./types";

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

export function extractClip(
  sourcePath: string,
  clipId: string,
  startTime: number,
  endTime: number,
  aspectRatio: AspectRatio = "9:16"
): Promise<string> {
  const outPath = clipPath(clipId);
  const duration = endTime - startTime;

  return new Promise((resolve, reject) => {
    ffmpeg(sourcePath)
      .setStartTime(startTime)
      .setDuration(duration)
      .videoFilters(ASPECT_FILTERS[aspectRatio])
      .outputOptions(["-c:v", "libx264", "-preset", "fast", "-crf", "23", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart"])
      .output(outPath)
      .on("end", () => resolve(outPath))
      .on("error", reject)
      .run();
  });
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
