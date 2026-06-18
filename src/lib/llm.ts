import Anthropic from "@anthropic-ai/sdk";
import { getSetting } from "./db";

const OMLX_BASE_URL = process.env.OMLX_URL || "http://localhost:8000";
const OMLX_MODEL = process.env.OMLX_MODEL || "mlx-community/Llama-3.3-70B-Instruct-4bit";
const OMLX_API_KEY = process.env.OMLX_API_KEY || "";

const CLAUDE_MODEL = "claude-opus-4-5";

// Max chars per chunk (~10 min of dialogue at average speaking pace)
const CHUNK_CHARS = 12000;

function authHeaders(): HeadersInit {
  return OMLX_API_KEY ? { Authorization: `Bearer ${OMLX_API_KEY}` } : {};
}

interface HighlightSegment {
  title: string;
  description: string;
  start_time: number;
  end_time: number;
  score: number;
}

// Convert VTT/SRT/plain transcript to compact "[MM:SS] Speaker: text" lines.
// Strips cue indices, "-->" timing lines, and blank lines; merges consecutive
// cues from the same speaker to reduce token count.
function compressTranscript(raw: string): string {
  const lines = raw.split("\n");
  const cues: { seconds: number; speaker: string; text: string }[] = [];

  let i = 0;
  if (lines[0]?.trim() === "WEBVTT") i = 1;

  while (i < lines.length) {
    const line = lines[i].trim();

    // Timestamp line: "00:00:02.280 --> 00:00:03.470" or "00:02.280 --> 00:03.470"
    if (line.includes("-->")) {
      const start = line.split("-->")[0].trim();
      const seconds = parseTimestamp(start);
      i++;
      const textLines: string[] = [];
      while (i < lines.length && lines[i].trim() !== "") {
        textLines.push(lines[i].trim());
        i++;
      }
      const full = textLines.join(" ");
      const colonIdx = full.indexOf(":");
      const speaker = colonIdx > 0 && colonIdx < 40 ? full.slice(0, colonIdx).trim() : "";
      const text = colonIdx > 0 && colonIdx < 40 ? full.slice(colonIdx + 1).trim() : full;
      if (text) cues.push({ seconds, speaker, text });
    } else {
      i++;
    }
  }

  // If no VTT cues found, return as-is (plain text transcript)
  if (cues.length === 0) return raw.trim();

  // Merge consecutive cues from the same speaker
  const merged: typeof cues = [];
  for (const cue of cues) {
    const prev = merged[merged.length - 1];
    if (prev && prev.speaker === cue.speaker && cue.seconds - prev.seconds < 10) {
      prev.text += " " + cue.text;
    } else {
      merged.push({ ...cue });
    }
  }

  return merged
    .map((c) => {
      const t = Math.round(c.seconds);
      return c.speaker ? `[${t}s] ${c.speaker}: ${c.text}` : `[${t}s] ${c.text}`;
    })
    .join("\n");
}

function parseTimestamp(ts: string): number {
  const parts = ts.replace(",", ".").split(":");
  if (parts.length === 3) {
    return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseFloat(parts[2]);
  }
  if (parts.length === 2) {
    return parseInt(parts[0]) * 60 + parseFloat(parts[1]);
  }
  return 0;
}

function buildPrompt(chunk: string, videoDuration: number, userContext?: string): string {
  const contextSection = userContext
    ? `\nThe user has provided the following context about what they're looking for:\n${userContext}\n\nUse this to prioritise moments that match their intent.\n`
    : "";
  return `You are a viral content expert. Analyze this podcast transcript segment and identify the most engaging, shareable moments that would work as short-form clips (15-90 seconds each).${contextSection}

Each line is prefixed with [Xs] where X is the exact timestamp in seconds from the start of the video. Use these values directly as start_time and end_time — do not convert or estimate.

For each highlight provide:
- A catchy title
- A brief description (1 sentence)
- start_time: the [Xs] value (just the number) where the moment begins
- end_time: the [Xs] value (just the number) where the moment ends
- A virality score (0-100)

Focus on: strong opinions, surprising facts, emotional moments, funny exchanges, actionable advice, controversial takes, compelling stories.

The full video is ${Math.round(videoDuration)} seconds long.

Transcript:
${chunk}

Respond with ONLY a JSON array with keys: title, description, start_time, end_time, score. No markdown, no explanation.`;
}

function parseHighlights(content: string): HighlightSegment[] {
  const jsonMatch = content.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];
  try {
    return JSON.parse(jsonMatch[0]) as HighlightSegment[];
  } catch {
    return [];
  }
}

async function analyzeChunkLocal(chunk: string, videoDuration: number, userContext?: string): Promise<HighlightSegment[]> {
  const res = await fetch(`${OMLX_BASE_URL}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({
      model: OMLX_MODEL,
      messages: [{ role: "user", content: buildPrompt(chunk, videoDuration, userContext) }],
      temperature: 0.3,
      max_tokens: 2048,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`oMLX request failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  return parseHighlights(data.choices?.[0]?.message?.content ?? "[]");
}

async function analyzeChunkClaude(chunk: string, videoDuration: number, userContext?: string): Promise<HighlightSegment[]> {
  const apiKey = getSetting("claude_api_key") || process.env.ANTHROPIC_API_KEY || "";
  if (!apiKey) throw new Error("Claude API key not set. Add it in Settings → AI Model.");

  const client = new Anthropic({ apiKey });
  const message = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 2048,
    messages: [{ role: "user", content: buildPrompt(chunk, videoDuration, userContext) }],
  });

  const content = message.content[0].type === "text" ? message.content[0].text : "[]";
  return parseHighlights(content);
}

async function analyzeChunk(chunk: string, videoDuration: number, userContext?: string): Promise<HighlightSegment[]> {
  const provider = getSetting("model_provider") ?? "local";
  return provider === "claude"
    ? analyzeChunkClaude(chunk, videoDuration, userContext)
    : analyzeChunkLocal(chunk, videoDuration, userContext);
}

export async function detectHighlights(
  transcript: string,
  videoDuration: number,
  onProgress?: (message: string, progress: number) => void,
  userContext?: string
): Promise<HighlightSegment[]> {
  const compressed = compressTranscript(transcript);

  // Split into overlapping chunks so clips near boundaries aren't missed
  const chunks: string[] = [];
  let offset = 0;
  while (offset < compressed.length) {
    chunks.push(compressed.slice(offset, offset + CHUNK_CHARS));
    offset += CHUNK_CHARS - 1000; // 1000-char overlap
  }

  // Sequential — local models can only run one inference at a time anyway
  const perChunk: HighlightSegment[][] = [];
  for (let i = 0; i < chunks.length; i++) {
    onProgress?.(`Analyzing chunk ${i + 1} of ${chunks.length}…`, 50 + Math.round((i / chunks.length) * 20));
    try {
      const result = await analyzeChunk(chunks[i], videoDuration, userContext);
      perChunk.push(result);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(`Chunk ${i + 1}/${chunks.length} failed: ${msg}`);
    }
  }

  const all = perChunk.flat().filter(
    (h) =>
      h.start_time >= 0 &&
      h.end_time <= videoDuration &&
      h.end_time - h.start_time >= 10 &&
      h.end_time - h.start_time <= 120
  );

  // Deduplicate by start_time proximity (within 15s = same moment)
  const deduped: HighlightSegment[] = [];
  for (const h of all.sort((a, b) => b.score - a.score)) {
    const isDupe = deduped.some((d) => Math.abs(d.start_time - h.start_time) < 15);
    if (!isDupe) deduped.push(h);
  }

  return deduped.slice(0, 10);
}

export async function checkOmlxHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${OMLX_BASE_URL}/v1/models`, {
      headers: authHeaders(),
      signal: AbortSignal.timeout(3000),
    });
    // 401 means the server is up but needs a key — still reachable
    return res.ok || res.status === 401;
  } catch {
    return false;
  }
}
