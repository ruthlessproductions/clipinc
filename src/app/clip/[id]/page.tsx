"use client";

import { use, useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useClipContext } from "@/context/clip-context";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { TrimSlider } from "@/components/editor/trim-slider";
import { AspectRatioPicker } from "@/components/editor/aspect-ratio-picker";
import { CaptionEditor } from "@/components/editor/caption-editor";
import { CaptionStylePicker } from "@/components/editor/caption-style-picker";
import { getCaptionStyle } from "@/lib/captions";
import type { AspectRatio, Caption } from "@/lib/types";
import type { CaptionStyleId } from "@/lib/captions";
import {
  Play,
  Pause,
  Download,
  Share2,
  ArrowLeft,
  AlertCircle,
  Loader2,
} from "lucide-react";

export default function ClipEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { getClip, getProject, updateClip } = useClipContext();
  const clip = getClip(id);
  const project = clip ? getProject(clip.projectId) : undefined;
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [startTime, setStartTime] = useState(clip?.startTime ?? 0);
  const [endTime, setEndTime] = useState(clip?.endTime ?? 0);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(clip?.aspectRatio ?? "9:16");
  const [captions, setCaptions] = useState<Caption[]>(clip?.captions ?? []);
  const [captionStyle, setCaptionStyle] = useState<CaptionStyleId | null>(null);
  const [currentTime, setCurrentTime] = useState(clip?.startTime ?? 0);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Seek to startTime when metadata is ready or startTime changes (and not playing)
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || isPlaying) return;
    vid.currentTime = startTime;
  }, [startTime, isPlaying]);

  // Enforce the end boundary during playback + track currentTime for caption preview
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    const onTimeUpdate = () => {
      setCurrentTime(vid.currentTime);
      if (vid.currentTime >= endTime) {
        vid.pause();
        vid.currentTime = startTime;
      }
    };
    vid.addEventListener("timeupdate", onTimeUpdate);
    return () => vid.removeEventListener("timeupdate", onTimeUpdate);
  }, [startTime, endTime]);

  const togglePlay = useCallback(() => {
    const vid = videoRef.current;
    if (!vid) return;
    if (vid.paused) {
      if (vid.currentTime >= endTime) vid.currentTime = startTime;
      vid.play();
    } else {
      vid.pause();
    }
  }, [startTime, endTime]);

  if (!clip) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-surface-500">Clip not found</p>
      </div>
    );
  }

  const handleExport = async () => {
    setIsExporting(true);
    setExportError(null);
    // Persist trim changes to DB before exporting so the export API picks them up
    await fetch(`/api/clips/${clip.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startTime, endTime, duration: endTime - startTime, aspectRatio }),
    }).catch(() => {});
    updateClip(clip.id, { startTime, endTime, duration: endTime - startTime, aspectRatio, captions });
    try {
      const res = await fetch(`/api/clips/${clip.id}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aspect_ratio: aspectRatio, caption_style: captionStyle }),
      });
      if (!res.ok) {
        const data = await res.json();
        setExportError(data.error ?? "Export failed");
      } else {
        window.location.href = `/api/clips/${clip.id}/download`;
      }
    } catch {
      setExportError("Failed to connect to export API");
    }
    setIsExporting(false);
  };

  const previewDimensions = {
    "9:16": { width: 225, height: 400 },
    "1:1": { width: 350, height: 350 },
    "16:9": { width: 400, height: 225 },
  };

  const dims = previewDimensions[aspectRatio];

  return (
    <div className="px-6 py-10 space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="text-surface-500 hover:text-surface-700 transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-surface-800">{clip.title}</h1>
          <p className="text-sm text-surface-500">{clip.description}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} disabled={isExporting}>
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {isExporting ? "Exporting…" : "Export"}
          </Button>
          <Button
            size="sm"
            onClick={() => router.push(`/export/${clip.id}`)}
          >
            <Share2 className="h-4 w-4" />
            Publish
          </Button>
        </div>
      </div>

      {exportError && (
        <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 px-4 py-3 text-xs text-amber-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {exportError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        <div className="space-y-6">
          <GlassCard className="flex items-center justify-center min-h-[400px]">
            <div
              className="relative rounded-xl bg-black overflow-hidden transition-all duration-300"
              style={{ width: dims.width, height: dims.height }}
            >
              <video
                ref={videoRef}
                src={`/api/projects/${clip.projectId}/video`}
                className="absolute inset-0 w-full h-full object-cover"
                preload="auto"
                onLoadedMetadata={() => {
                  // Seek to clip start as soon as we know the video's timeline
                  if (videoRef.current) videoRef.current.currentTime = startTime;
                }}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                playsInline
              />

              {captionStyle && captions.length > 0 && (
                <CaptionPreviewOverlay
                  captions={captions}
                  currentTime={currentTime}
                  styleId={captionStyle}
                />
              )}

              <button
                onClick={togglePlay}
                className="absolute inset-0 z-30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full gradient-brand glow-strong">
                  {isPlaying ? (
                    <Pause className="h-6 w-6 text-white" />
                  ) : (
                    <Play className="h-6 w-6 text-white ml-1" />
                  )}
                </div>
              </button>
            </div>
          </GlassCard>

          <GlassCard>
            <TrimSlider
              duration={project?.duration || clip.endTime + 120}
              startTime={startTime}
              endTime={endTime}
              onStartChange={setStartTime}
              onEndChange={setEndTime}
            />
          </GlassCard>
        </div>

        <div className="space-y-4">
          <GlassCard className="space-y-4">
            <h3 className="text-sm font-medium text-surface-700">
              Aspect Ratio
            </h3>
            <AspectRatioPicker value={aspectRatio} onChange={setAspectRatio} />
          </GlassCard>

          <GlassCard className="space-y-4">
            <CaptionStylePicker value={captionStyle} onChange={setCaptionStyle} />
          </GlassCard>

          <GlassCard>
            <CaptionEditor captions={captions} onUpdate={setCaptions} />
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

// ── Live caption preview overlay ─────────────────────────────────────────────

function CaptionPreviewOverlay({
  captions,
  currentTime,
  styleId,
}: {
  captions: Caption[];
  currentTime: number;
  styleId: CaptionStyleId;
}) {
  const style = getCaptionStyle(styleId);

  // Find the active caption segment
  const seg = captions.find(
    (c) => currentTime >= c.startTime && currentTime < c.endTime
  );
  if (!seg) return null;

  // Approximate which word is active
  const words = seg.text.trim().split(/\s+/).filter(Boolean);
  const elapsed = currentTime - seg.startTime;
  const duration = seg.endTime - seg.startTime;
  const totalLen = words.reduce((s, w) => s + Math.max(w.length, 1), 0);

  let cursor = 0;
  let activeIdx = words.length - 1;
  for (let i = 0; i < words.length; i++) {
    const wordFrac = Math.max(words[i].length, 1) / totalLen;
    const wordEnd = cursor + wordFrac * duration;
    if (elapsed < wordEnd) { activeIdx = i; break; }
    cursor += wordFrac * duration;
  }

  // Show wordsPerLine words centred on active word
  const half = Math.floor(style.wordsPerLine / 2);
  const lineStart = Math.max(0, Math.min(activeIdx - half, words.length - style.wordsPerLine));
  const lineWords = words.slice(lineStart, lineStart + style.wordsPerLine);
  const activeInLine = activeIdx - lineStart;

  return (
    <div className="absolute bottom-4 left-2 right-2 z-20 pointer-events-none flex justify-center">
      <p
        className="text-center font-bold leading-tight drop-shadow-lg"
        style={{
          fontSize: "clamp(14px, 4.5vw, 20px)",
          WebkitTextStroke: "1px black",
          textShadow: "0 0 6px #000, 0 0 12px #000",
          color: style.cssColor,
        }}
      >
        {lineWords.map((word, i) => (
          <span
            key={i}
            style={{
              color: i === activeInLine ? style.cssHighlight : style.cssColor,
              marginRight: i < lineWords.length - 1 ? "0.35em" : 0,
              transition: "color 0.1s",
            }}
          >
            {word}
          </span>
        ))}
      </p>
    </div>
  );
}
