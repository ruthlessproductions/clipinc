import fs from "fs";
import os from "os";
import path from "path";
import type { Caption } from "./types";

// ─── Style presets ────────────────────────────────────────────────────────────
// ASS colours use AABBGGRR byte order (opposite of CSS hex).

export const CAPTION_STYLES = [
  {
    id: "classic",
    name: "Classic",
    description: "White + yellow highlight",
    cssColor: "#FFFFFF",
    cssHighlight: "#FFFF00",
    fontName: "Arial",
    fontSize: 72,
    bold: true,
    outline: 4,
    shadow: 0,
    marginV: 120,
    wordsPerLine: 4,
    assPrimary:   "&H00FFFFFF",   // white (resting colour)
    assSecondary: "&H0000FFFF",   // yellow karaoke fill — AABBGGRR of #FFFF00
    assOutline:   "&H00000000",
    assBack:      "&H00000000",
  },
  {
    id: "neon",
    name: "Neon",
    description: "White + purple highlight",
    cssColor: "#FFFFFF",
    cssHighlight: "#C84BFF",
    fontName: "Arial",
    fontSize: 68,
    bold: true,
    outline: 3,
    shadow: 0,
    marginV: 120,
    wordsPerLine: 4,
    assPrimary:   "&H00FFFFFF",
    assSecondary: "&H00FF4BC8",   // #C84BFF → R=C8 G=4B B=FF → BBGGRR = FF4BC8
    assOutline:   "&H00000000",
    assBack:      "&H00000000",
  },
  {
    id: "bold",
    name: "Bold",
    description: "Large + orange highlight",
    cssColor: "#FFFFFF",
    cssHighlight: "#FF8C00",
    fontName: "Arial",
    fontSize: 88,
    bold: true,
    outline: 5,
    shadow: 0,
    marginV: 140,
    wordsPerLine: 3,
    assPrimary:   "&H00FFFFFF",
    assSecondary: "&H00008CFF",   // #FF8C00 → R=FF G=8C B=00 → BBGGRR = 008CFF
    assOutline:   "&H00000000",
    assBack:      "&H00000000",
  },
] as const;

export type CaptionStyleId = (typeof CAPTION_STYLES)[number]["id"];

export function getCaptionStyle(id: string) {
  return CAPTION_STYLES.find((s) => s.id === id) ?? CAPTION_STYLES[0];
}

// ─── Word timing ──────────────────────────────────────────────────────────────

export interface WordTiming {
  word: string;
  start: number; // seconds, relative to clip start (0 = first frame)
  end: number;
}

/**
 * Distribute words across a caption segment proportional to word length.
 * Good enough for animated captions without per-word Whisper timestamps.
 */
function approximateWordTimings(
  text: string,
  segStart: number,
  segEnd: number,
  clipStart: number
): WordTiming[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];

  const segDuration = segEnd - segStart;
  const totalLen = words.reduce((s, w) => s + Math.max(w.length, 1), 0);
  let cursor = segStart - clipStart; // offset relative to clip

  return words.map((word, i) => {
    const dur = (Math.max(word.length, 1) / totalLen) * segDuration;
    const wStart = cursor;
    const wEnd = i === words.length - 1 ? segEnd - clipStart : cursor + dur;
    cursor += dur;
    return { word, start: Math.max(0, wStart), end: Math.max(0, wEnd) };
  });
}

// ─── ASS generation ───────────────────────────────────────────────────────────

function toASSTime(seconds: number): string {
  const t = Math.max(0, seconds);
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = Math.floor(t % 60);
  const cs = Math.min(99, Math.round((t % 1) * 100));
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

export function generateASSContent(
  captions: Caption[],
  clipStartTime: number,
  styleId: string
): string {
  const style = getCaptionStyle(styleId);

  // Convert caption segments → word timings, relative to clip start
  const words: WordTiming[] = [];
  for (const seg of captions) {
    const timings = approximateWordTimings(seg.text, seg.startTime, seg.endTime, clipStartTime);
    for (const t of timings) {
      if (t.start >= 0 && t.end > t.start) words.push(t);
    }
  }

  if (!words.length) return "";

  // Group into display lines
  const lines: WordTiming[][] = [];
  for (let i = 0; i < words.length; i += style.wordsPerLine) {
    lines.push(words.slice(i, i + style.wordsPerLine));
  }

  const styleRow = [
    "Default",
    style.fontName,
    style.fontSize,
    style.assPrimary,
    style.assSecondary,
    style.assOutline,
    style.assBack,
    style.bold ? "-1" : "0",
    "0",   // italic
    "0",   // underline
    "0",   // strikeout
    "100", "100", // scaleX, scaleY
    "0",   // spacing
    "0",   // angle
    "1",   // border style (outline + shadow)
    style.outline,
    style.shadow,
    "2",   // alignment: centred bottom
    "60", "60", // marginL, marginR
    style.marginV,
    "1",   // encoding
  ].join(",");

  const header = [
    "[Script Info]",
    "ScriptType: v4.00+",
    "PlayResX: 1080",
    "PlayResY: 1920",
    "WrapStyle: 0",
    "ScaledBorderAndShadow: yes",
    "",
    "[V4+ Styles]",
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
    `Style: ${styleRow}`,
    "",
    "[Events]",
    "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
  ].join("\n");

  const events = lines
    .map((line) => {
      const lineStart = line[0].start;
      const lineEnd = line[line.length - 1].end;
      const text = line
        .map((w) => {
          const cs = Math.max(1, Math.round((w.end - w.start) * 100));
          const clean = w.word.replace(/[{}\\]/g, ""); // strip ASS control chars
          return `{\\kf${cs}}${clean}`;
        })
        .join(" ");
      return `Dialogue: 0,${toASSTime(lineStart)},${toASSTime(lineEnd)},Default,,0,0,0,,${text}`;
    })
    .join("\n");

  return `${header}\n${events}\n`;
}

export function writeTempASS(content: string): string {
  const tmpFile = path.join(os.tmpdir(), `clipinc-${Date.now()}.ass`);
  fs.writeFileSync(tmpFile, content, "utf8");
  return tmpFile;
}
