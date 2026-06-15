"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useClipContext } from "@/context/clip-context";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { TrimSlider } from "@/components/editor/trim-slider";
import { AspectRatioPicker } from "@/components/editor/aspect-ratio-picker";
import { CaptionEditor } from "@/components/editor/caption-editor";
import type { AspectRatio, Caption } from "@/lib/types";
import {
  Film,
  Play,
  Pause,
  Download,
  Share2,
  ArrowLeft,
} from "lucide-react";

export default function ClipEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { getClip, updateClip } = useClipContext();
  const clip = getClip(id);
  const [isPlaying, setIsPlaying] = useState(false);

  if (!clip) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-surface-500">Clip not found</p>
      </div>
    );
  }

  const [startTime, setStartTime] = useState(clip.startTime);
  const [endTime, setEndTime] = useState(clip.endTime);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(
    clip.aspectRatio
  );
  const [captions, setCaptions] = useState<Caption[]>(clip.captions);

  const handleSave = () => {
    updateClip(clip.id, {
      startTime,
      endTime,
      duration: endTime - startTime,
      aspectRatio,
      captions,
    });
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
          <Button variant="outline" size="sm" onClick={handleSave}>
            <Download className="h-4 w-4" />
            Export
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

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        <div className="space-y-6">
          <GlassCard className="flex items-center justify-center min-h-[400px]">
            <div
              className="relative rounded-xl bg-surface-100 flex items-center justify-center overflow-hidden transition-all duration-300"
              style={{ width: dims.width, height: dims.height }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-brand-900/30 via-surface-0/50 to-surface-0/70" />
              <Film className="h-12 w-12 text-surface-400 relative z-10" />

              {captions.length > 0 && (
                <div className="absolute bottom-4 left-4 right-4 z-20">
                  <div className="rounded-lg bg-black/70 px-3 py-2 text-center">
                    <p className="text-white text-sm font-medium">
                      {captions[0].text}
                    </p>
                  </div>
                </div>
              )}

              <button
                onClick={() => setIsPlaying(!isPlaying)}
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
              duration={clip.endTime + 60}
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

          <GlassCard>
            <CaptionEditor captions={captions} onUpdate={setCaptions} />
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
