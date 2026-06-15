"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatDuration, formatTimeAgo } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { Clip } from "@/lib/types";
import {
  Clock,
  Sparkles,
  Play,
  Film,
} from "lucide-react";

interface ClipCardProps {
  clip: Clip;
}

const statusVariant = {
  processing: "warning" as const,
  ready: "brand" as const,
  exported: "default" as const,
  published: "success" as const,
};

export function ClipCard({ clip }: ClipCardProps) {
  return (
    <Link href={`/clip/${clip.id}`}>
      <div className="glass glass-hover rounded-2xl overflow-hidden transition-all duration-300 group cursor-pointer hover:glow">
        <div className="relative aspect-video bg-surface-100 flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-900/40 via-surface-0/60 to-surface-0/80" />
          <Film className="h-10 w-10 text-surface-400 relative z-10" />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20">
            <div className="flex h-12 w-12 items-center justify-center rounded-full gradient-brand glow-strong">
              <Play className="h-5 w-5 text-white ml-0.5" />
            </div>
          </div>
          <div className="absolute bottom-2 right-2 z-20 flex items-center gap-1 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] text-white font-mono">
            <Clock className="h-2.5 w-2.5" />
            {formatDuration(clip.duration)}
          </div>
        </div>

        <div className="p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-medium text-surface-800 line-clamp-1">
              {clip.title}
            </h3>
            <Badge variant={statusVariant[clip.status]} className="shrink-0">
              {clip.status}
            </Badge>
          </div>
          <p className="text-xs text-surface-500 line-clamp-2">
            {clip.description}
          </p>
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1 text-xs text-brand-400">
              <Sparkles className="h-3 w-3" />
              <span className="font-medium">{clip.score}</span>
              <span className="text-surface-500">score</span>
            </div>
            <span className="text-[10px] text-surface-500">
              {formatTimeAgo(clip.createdAt)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
