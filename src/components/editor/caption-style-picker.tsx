"use client";

import { CAPTION_STYLES } from "@/lib/captions";
import type { CaptionStyleId } from "@/lib/captions";
import { cn } from "@/lib/utils";
import { Type, X } from "lucide-react";

interface CaptionStylePickerProps {
  value: CaptionStyleId | null;
  onChange: (style: CaptionStyleId | null) => void;
}

export function CaptionStylePicker({ value, onChange }: CaptionStylePickerProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-surface-700">
          <Type className="h-4 w-4" />
          Animated Captions
        </div>
        {value && (
          <button
            onClick={() => onChange(null)}
            className="flex items-center gap-1 text-xs text-surface-500 hover:text-surface-700 transition-colors cursor-pointer"
          >
            <X className="h-3 w-3" />
            Off
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {CAPTION_STYLES.map((style) => {
          const isSelected = value === style.id;
          return (
            <button
              key={style.id}
              onClick={() => onChange(isSelected ? null : (style.id as CaptionStyleId))}
              className={cn(
                "relative flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 transition-all cursor-pointer",
                isSelected
                  ? "border-brand-500 bg-brand-500/10 glow"
                  : "border-surface-300 glass glass-hover"
              )}
            >
              {/* Mini preview */}
              <div className="flex items-end justify-center h-10 w-full rounded-lg bg-black overflow-hidden px-1">
                <p
                  className="text-center font-bold leading-tight mb-1"
                  style={{
                    fontSize: 9,
                    color: style.cssColor,
                    WebkitTextStroke: "0.3px black",
                    textShadow: "0 0 3px #000",
                    lineHeight: 1.2,
                  }}
                >
                  {"Hello ".split("").map((_, ci) => (
                    <span key={ci} />
                  ))}
                  {/* Show two words: first normal, second highlighted */}
                  <span style={{ color: style.cssColor }}>Hello </span>
                  <span style={{ color: style.cssHighlight }}>world</span>
                </p>
              </div>

              <span
                className={cn(
                  "text-xs font-medium",
                  isSelected ? "text-brand-400" : "text-surface-600"
                )}
              >
                {style.name}
              </span>
            </button>
          );
        })}
      </div>

      {value && (
        <p className="text-xs text-surface-500">
          Captions will be burned into the exported video.
        </p>
      )}
    </div>
  );
}
