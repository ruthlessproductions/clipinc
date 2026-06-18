"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatDuration } from "@/lib/utils";

interface TrimSliderProps {
  duration: number;
  startTime: number;
  endTime: number;
  onStartChange: (t: number) => void;
  onEndChange: (t: number) => void;
}

// Stable pseudo-random heights seeded by index so they don't flicker on re-render
function barHeight(i: number): number {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return 20 + (x - Math.floor(x)) * 60;
}

const BARS = 50;
const VIEW_WINDOW = 5 * 60; // slider shows at most 5 minutes of the video

export function TrimSlider({ duration, startTime, endTime, onStartChange, onEndChange }: TrimSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<"start" | "end" | null>(null);
  const [, forceUpdate] = useState(0);

  // Lock the 5-minute view window on mount — centered on the clip's midpoint.
  // Stored in a ref so dragging the handles doesn't cause the window to shift.
  const windowStartRef = useRef<number | null>(null);
  if (windowStartRef.current === null) {
    const mid = (startTime + endTime) / 2;
    const ideal = mid - VIEW_WINDOW / 2;
    windowStartRef.current = Math.max(0, Math.min(ideal, Math.max(0, duration - VIEW_WINDOW)));
  }
  const windowStart = windowStartRef.current;
  const windowEnd = Math.min(duration, windowStart + VIEW_WINDOW);
  const windowDuration = windowEnd - windowStart;

  // Map a pixel X position to an absolute video time within the window
  const getTime = useCallback((clientX: number) => {
    if (!trackRef.current) return 0;
    const rect = trackRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return Math.round((windowStart + pct * windowDuration) * 10) / 10;
  }, [windowStart, windowDuration]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const t = getTime(e.clientX);
      if (dragging.current === "start" && t < endTime - 1) {
        onStartChange(Math.max(0, t));
        forceUpdate(n => n + 1);
      }
      if (dragging.current === "end" && t > startTime + 1) {
        onEndChange(Math.min(duration, t));
        forceUpdate(n => n + 1);
      }
    };
    const onUp = () => { dragging.current = null; forceUpdate(n => n + 1); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [startTime, endTime, duration, getTime, onStartChange, onEndChange]);

  // Percentages relative to the view window (clamped so handles stay on-screen)
  const startPct = Math.max(0, Math.min(100, ((startTime - windowStart) / windowDuration) * 100));
  const endPct   = Math.max(0, Math.min(100, ((endTime   - windowStart) / windowDuration) * 100));

  const parseTimeInput = (val: string): number | null => {
    const parts = val.split(":").map(Number);
    if (parts.some(isNaN)) return null;
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return null;
  };

  return (
    <div className="space-y-3">
      {/* Time inputs */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-surface-500 uppercase tracking-wide">Start</span>
          <input
            type="text"
            defaultValue={formatDuration(startTime)}
            key={`start-${Math.floor(startTime)}`}
            className="w-20 rounded-lg border border-surface-300 bg-surface-100/50 px-2 py-1 text-center text-sm font-mono text-surface-800 focus:border-brand-500 focus:outline-none"
            onBlur={(e) => {
              const t = parseTimeInput(e.target.value);
              if (t !== null && t >= 0 && t < endTime - 1) onStartChange(t);
            }}
          />
        </div>

        <div className="text-center">
          <span className="text-sm font-medium text-brand-400">
            {formatDuration(endTime - startTime)}
          </span>
          <p className="text-[10px] text-surface-500">clip length</p>
        </div>

        <div className="flex flex-col gap-1 items-end">
          <span className="text-[10px] text-surface-500 uppercase tracking-wide">End</span>
          <input
            type="text"
            defaultValue={formatDuration(endTime)}
            key={`end-${Math.floor(endTime)}`}
            className="w-20 rounded-lg border border-surface-300 bg-surface-100/50 px-2 py-1 text-center text-sm font-mono text-surface-800 focus:border-brand-500 focus:outline-none"
            onBlur={(e) => {
              const t = parseTimeInput(e.target.value);
              if (t !== null && t <= duration && t > startTime + 1) onEndChange(t);
            }}
          />
        </div>
      </div>

      {/* Waveform track */}
      <div
        ref={trackRef}
        className="relative h-14 cursor-pointer select-none rounded-lg bg-surface-200 overflow-hidden"
      >
        {/* Waveform bars — seeded by absolute bar index so colours are stable */}
        <div className="absolute inset-0 flex items-center gap-px px-1">
          {Array.from({ length: BARS }).map((_, i) => {
            const barFrac = i / BARS; // 0–1 within the window
            const inRange = barFrac >= startPct / 100 && barFrac <= endPct / 100;
            return (
              <div
                key={i}
                className="flex-1 rounded-full transition-colors"
                style={{
                  height: `${barHeight(i)}%`,
                  background: inRange ? "rgba(139, 92, 246, 0.6)" : "rgba(255,255,255,0.08)",
                }}
              />
            );
          })}
        </div>

        {/* Selected region overlay */}
        <div
          className="absolute top-0 bottom-0 border-2 border-brand-400 bg-brand-500/10 rounded"
          style={{ left: `${startPct}%`, width: `${endPct - startPct}%` }}
        />

        {/* Start handle */}
        <div
          className="absolute top-0 bottom-0 w-4 -translate-x-1/2 cursor-col-resize bg-brand-400 rounded-l flex items-center justify-center"
          style={{ left: `${startPct}%` }}
          onMouseDown={(e) => { e.preventDefault(); dragging.current = "start"; forceUpdate(n => n + 1); }}
        >
          <div className="w-0.5 h-4 bg-white/60 rounded-full" />
        </div>

        {/* End handle */}
        <div
          className="absolute top-0 bottom-0 w-4 -translate-x-1/2 cursor-col-resize bg-brand-400 rounded-r flex items-center justify-center"
          style={{ left: `${endPct}%` }}
          onMouseDown={(e) => { e.preventDefault(); dragging.current = "end"; forceUpdate(n => n + 1); }}
        >
          <div className="w-0.5 h-4 bg-white/60 rounded-full" />
        </div>
      </div>

      {/* Timeline labels show the visible window, not 0→full duration */}
      <div className="flex justify-between text-[10px] text-surface-500">
        <span>{formatDuration(windowStart)}</span>
        <span>{formatDuration(windowEnd)}</span>
      </div>
    </div>
  );
}
