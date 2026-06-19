import { v4 as uuid } from "uuid";
import type { Caption } from "./types";

function parseTimestamp(ts: string): number {
  const parts = ts.replace(",", ".").split(":");
  if (parts.length === 3) return +parts[0] * 3600 + +parts[1] * 60 + parseFloat(parts[2]);
  if (parts.length === 2) return +parts[0] * 60 + parseFloat(parts[1]);
  return parseFloat(parts[0]);
}

/**
 * Parse SRT/VTT transcript and return Caption segments that overlap
 * with the given clip time range.
 */
export function extractClipCaptions(
  transcript: string,
  clipStart: number,
  clipEnd: number
): Caption[] {
  const lines = transcript.split("\n");
  const captions: Caption[] = [];
  let i = 0;
  if (lines[0]?.trim() === "WEBVTT") i = 1;

  while (i < lines.length) {
    const line = lines[i].trim();
    if (line.includes("-->")) {
      const [startStr, rest] = line.split("-->");
      // Strip VTT position tags that may appear after the end timestamp
      const endStr = rest.trim().split(/\s/)[0];
      const start = parseTimestamp(startStr.trim());
      const end = parseTimestamp(endStr.trim());
      i++;
      const textLines: string[] = [];
      while (i < lines.length && lines[i].trim() !== "") {
        textLines.push(lines[i].trim());
        i++;
      }
      const text = textLines.join(" ").trim();
      if (text && end > clipStart && start < clipEnd) {
        captions.push({ id: uuid(), text, startTime: start, endTime: end });
      }
    } else {
      i++;
    }
  }
  return captions;
}
