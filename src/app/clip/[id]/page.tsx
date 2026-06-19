"use client";

import React, { use, useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useClipContext } from "@/context/clip-context";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { TrimSlider } from "@/components/editor/trim-slider";
import { AspectRatioPicker } from "@/components/editor/aspect-ratio-picker";
import { CaptionEditor } from "@/components/editor/caption-editor";
import { CaptionStylePicker } from "@/components/editor/caption-style-picker";
import { getCaptionStyle, CAPTION_FONTS, DEFAULT_FONT } from "@/lib/captions";
import { extractClipCaptions } from "@/lib/transcript";
import { cn } from "@/lib/utils";
import type { AspectRatio, Caption } from "@/lib/types";
import type { CaptionStyleId, CaptionFontId } from "@/lib/captions";
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
  const [captionFont, setCaptionFont] = useState<CaptionFontId>(DEFAULT_FONT);
  const [captionY, setCaptionY] = useState(8); // % from bottom
  const [currentTime, setCurrentTime] = useState(clip?.startTime ?? 0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load captions from DB on mount; fall back to transcript-derived captions
  useEffect(() => {
    if (!clip) return;
    fetch(`/api/clips/${clip.id}`)
      .then((r) => r.json())
      .then((data) => {
        // Sync trim times from DB (the export route may have corrected 0-valued times)
        if (data.start_time > 0) setStartTime(data.start_time as number);
        if (data.end_time > 0) setEndTime(data.end_time as number);

        const dbCaptions = data.captions as { id: string; text: string; start_time: number; end_time: number }[] | undefined;
        if (dbCaptions && dbCaptions.length > 0) {
          setCaptions(dbCaptions.map((c) => ({ id: c.id, text: c.text, startTime: c.start_time, endTime: c.end_time })));
        } else {
          // Derive captions from the project transcript
          const clipStart = data.start_time > 0 ? (data.start_time as number) : clip.startTime;
          const clipEnd = data.end_time > 0 ? (data.end_time as number) : clip.endTime;
          fetch(`/api/projects/${clip.projectId}/transcript`)
            .then((r) => r.json())
            .then(({ transcript }) => {
              if (transcript) {
                const derived = extractClipCaptions(transcript, clipStart, clipEnd);
                if (derived.length > 0) setCaptions(derived);
              }
            })
            .catch(() => {});
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clip?.id]);

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
    // Persist trim + captions to DB before exporting so the export API picks them up.
    // Only send trim times when they're valid — don't overwrite a good DB value with zeros.
    const trimValid = endTime > startTime;
    await fetch(`/api/clips/${clip.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(trimValid ? { startTime, endTime, duration: endTime - startTime } : {}),
        aspectRatio,
        captions,
      }),
    }).catch(() => {});
    if (trimValid) updateClip(clip.id, { startTime, endTime, duration: endTime - startTime, aspectRatio, captions });
    else updateClip(clip.id, { aspectRatio, captions });
    try {
      const res = await fetch(`/api/clips/${clip.id}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aspect_ratio: aspectRatio, caption_style: captionStyle, caption_font: captionFont, caption_position: captionY }),
      });
      if (!res.ok) {
        const data = await res.json();
        setExportError(data.error ?? "Export failed");
      } else {
        // Re-fetch clip to reflect any times the export route corrected (e.g. from 0 → real values)
        const fresh = await fetch(`/api/clips/${clip.id}`).then((r) => r.json()).catch(() => null);
        if (fresh?.start_time > 0) setStartTime(fresh.start_time as number);
        if (fresh?.end_time > 0) setEndTime(fresh.end_time as number);
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
              ref={containerRef}
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

              {captionStyle && (
                <CaptionPreviewOverlay
                  captions={captions}
                  currentTime={currentTime}
                  styleId={captionStyle}
                  fontId={captionFont}
                  captionY={captionY}
                  onCaptionYChange={setCaptionY}
                  containerRef={containerRef}
                />
              )}

              <button
                onClick={togglePlay}
                className="absolute inset-0 z-20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
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
            {captionStyle && (
              <div className="space-y-2 pt-1 border-t border-surface-200">
                <p className="text-xs font-medium text-surface-600">Font</p>
                <div className="grid grid-cols-2 gap-2">
                  {CAPTION_FONTS.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setCaptionFont(f.id as CaptionFontId)}
                      className={cn(
                        "rounded-lg border px-3 py-2 text-sm font-bold transition-all cursor-pointer",
                        captionFont === f.id
                          ? "border-brand-500 bg-brand-500/10 text-brand-400"
                          : "border-surface-300 glass glass-hover text-surface-600"
                      )}
                      style={{ fontFamily: f.id }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </GlassCard>

          <GlassCard>
            <CaptionEditor captions={captions} onUpdate={setCaptions} />
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

// ── Live caption preview overlay (draggable) ─────────────────────────────────

function CaptionPreviewOverlay({
  captions,
  currentTime,
  styleId,
  fontId,
  captionY,
  onCaptionYChange,
  containerRef,
}: {
  captions: Caption[];
  currentTime: number;
  styleId: CaptionStyleId;
  fontId: CaptionFontId;
  captionY: number;
  onCaptionYChange: (y: number) => void;
  containerRef: React.RefObject<HTMLDivElement>;
}) {
  const style = getCaptionStyle(styleId);
  const isDragging = useRef(false);

  // Find the active caption segment
  const seg = captions.find(
    (c) => currentTime >= c.startTime && currentTime < c.endTime
  );

  // Approximate which word is active
  const words = seg ? seg.text.trim().split(/\s+/).filter(Boolean) : [];
  let activeIdx = 0;
  if (seg && words.length > 0) {
    const elapsed = currentTime - seg.startTime;
    const duration = seg.endTime - seg.startTime;
    const totalLen = words.reduce((s, w) => s + Math.max(w.length, 1), 0);
    let cursor = 0;
    activeIdx = words.length - 1;
    for (let i = 0; i < words.length; i++) {
      const wordFrac = Math.max(words[i].length, 1) / totalLen;
      const wordEnd = cursor + wordFrac * duration;
      if (elapsed < wordEnd) { activeIdx = i; break; }
      cursor += wordFrac * duration;
    }
  }

  const half = Math.floor(style.wordsPerLine / 2);
  const lineStart = Math.max(0, Math.min(activeIdx - half, words.length - style.wordsPerLine));
  const lineWords = words.slice(lineStart, lineStart + style.wordsPerLine);
  const activeInLine = activeIdx - lineStart;

  const startDrag = (clientY: number) => {
    isDragging.current = true;

    const onMove = (y: number) => {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = (1 - (y - rect.top) / rect.height) * 100;
      onCaptionYChange(Math.max(0, Math.min(95, pct)));
    };

    const onMouseMove = (e: MouseEvent) => onMove(e.clientY);
    const onTouchMove = (e: TouchEvent) => onMove(e.touches[0].clientY);
    const stop = () => {
      isDragging.current = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", stop);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", stop);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", stop);
    document.addEventListener("touchmove", onTouchMove, { passive: true });
    document.addEventListener("touchend", stop);
  };

  return (
    <div
      className="absolute left-2 right-2 z-30 flex justify-center select-none"
      style={{ bottom: `${captionY}%` }}
      onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); startDrag(e.clientY); }}
      onTouchStart={(e) => { e.stopPropagation(); startDrag(e.touches[0].clientY); }}
    >
      <p
        className="text-center font-bold leading-tight drop-shadow-lg cursor-ns-resize"
        style={{
          fontFamily: fontId,
          fontSize: "clamp(14px, 4.5vw, 20px)",
          WebkitTextStroke: "1px black",
          textShadow: "0 0 6px #000, 0 0 12px #000",
          color: style.cssColor,
        }}
      >
        {seg ? lineWords.map((word, i) => (
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
        )) : (
          <span style={{ color: style.cssHighlight }}>Caption preview</span>
        )}
      </p>
    </div>
  );
}
