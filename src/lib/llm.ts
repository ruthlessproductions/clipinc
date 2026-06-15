const OMLX_BASE_URL = process.env.OMLX_URL || "http://localhost:8000";
const OMLX_MODEL = process.env.OMLX_MODEL || "mlx-community/Llama-3.3-70B-Instruct-4bit";

interface HighlightSegment {
  title: string;
  description: string;
  start_time: number;
  end_time: number;
  score: number;
}

export async function detectHighlights(
  transcript: string,
  videoDuration: number
): Promise<HighlightSegment[]> {
  const prompt = `You are a viral content expert. Analyze this podcast transcript and identify the most engaging, shareable moments that would work as short-form clips (15-90 seconds each).

For each highlight, provide:
- A catchy title (for the clip)
- A brief description (1 sentence)
- Start and end timestamps (in seconds)
- A virality score (0-100)

Focus on: strong opinions, surprising facts, emotional moments, funny exchanges, actionable advice, controversial takes, and compelling stories.

The video is ${Math.round(videoDuration)} seconds long.

Transcript:
${transcript}

Respond with ONLY a JSON array of objects with keys: title, description, start_time, end_time, score. No markdown, no explanation.`;

  const res = await fetch(`${OMLX_BASE_URL}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OMLX_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 4096,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`oMLX request failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? "[]";

  const jsonMatch = content.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error("Failed to parse highlights from LLM response");
  }

  const highlights: HighlightSegment[] = JSON.parse(jsonMatch[0]);

  return highlights
    .filter(
      (h) =>
        h.start_time >= 0 &&
        h.end_time <= videoDuration &&
        h.end_time - h.start_time >= 10 &&
        h.end_time - h.start_time <= 120
    )
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}

export async function checkOmlxHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${OMLX_BASE_URL}/v1/models`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}
