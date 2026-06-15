"use client";

import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/utils";

interface TrimSliderProps {
  duration: number;
  startTime: number;
  endTime: number;
  onStartChange: (t: number) => void;
  onEndChange: (t: number) => void;
}

export function TrimSlider({
  duration,
  startTime,
  endTime,
  onStartChange,
  onEndChange,
}: TrimSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<"start" | "end" | null>(null);

  const getTimeFromPosition = useCallback(
    (clientX: number) => {
      if (!trackRef.current) return 0;
      const rect = trackRef.current.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return pct * duration;
    },
    [duration]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging) return;
      const time = getTimeFromPosition(e.clientX);
      if (dragging === "start" && time < endTime - 1) onStartChange(time);
      if (dragging === "end" && time > startTime + 1) onEndChange(time);
    },
    [dragging, startTime, endTime, getTimeFromPosition, onStartChange, onEndChange]
  );

  const startPct = (startTime / duration) * 100;
  const endPct = (endTime / duration) * 100;

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs text-surface-500">
        <span>{formatDuration(startTime)}</span>
        <span className="text-brand-400 font-medium">
          {formatDuration(endTime - startTime)} clip
        </span>
        <span>{formatDuration(endTime)}</span>
      </div>
      <div
        ref={trackRef}
        className="relative h-10 cursor-pointer rounded-lg bg-surface-200"
        onMouseMove={handleMouseMove}
        onMouseUp={() => setDragging(null)}
        onMouseLeave={() => setDragging(null)}
      >
        <div className="absolute inset-0 flex items-center">
          {Array.from({ length: 40 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 mx-px"
              style={{
                height: `${20 + Math.random() * 60}%`,
                background:
                  i / 40 >= startPct / 100 && i / 40 <= endPct / 100
                    ? "rgba(139, 92, 246, 0.4)"
                    : "rgba(255, 255, 255, 0.06)",
              }}
            />
          ))}
        </div>

        <div
          className="absolute top-0 bottom-0 border-2 border-brand-400 rounded-md bg-brand-500/10"
          style={{ left: `${startPct}%`, width: `${endPct - startPct}%` }}
        />

        <div
          className={cn(
            "absolute top-0 bottom-0 w-3 -translate-x-1/2 cursor-col-resize rounded-l-md bg-brand-400 transition-transform",
            dragging === "start" && "scale-x-125"
          )}
          style={{ left: `${startPct}%` }}
          onMouseDown={(e) => {
            e.stopPropagation();
            setDragging("start");
          }}
        />
        <div
          className={cn(
            "absolute top-0 bottom-0 w-3 -translate-x-1/2 cursor-col-resize rounded-r-md bg-brand-400 transition-transform",
            dragging === "end" && "scale-x-125"
          )}
          style={{ left: `${endPct}%` }}
          onMouseDown={(e) => {
            e.stopPropagation();
            setDragging("end");
          }}
        />
      </div>
      <div className="flex justify-between text-xs text-surface-500">
        <span>0:00</span>
        <span>{formatDuration(duration)}</span>
      </div>
    </div>
  );
}
