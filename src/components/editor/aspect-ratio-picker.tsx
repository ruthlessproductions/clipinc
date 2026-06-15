"use client";

import { cn } from "@/lib/utils";
import type { AspectRatio } from "@/lib/types";
import { Smartphone, Square, Monitor } from "lucide-react";

interface AspectRatioPickerProps {
  value: AspectRatio;
  onChange: (ratio: AspectRatio) => void;
}

const ratios: { value: AspectRatio; label: string; icon: typeof Smartphone; desc: string }[] = [
  { value: "9:16", label: "Vertical", icon: Smartphone, desc: "TikTok, Reels, Shorts" },
  { value: "1:1", label: "Square", icon: Square, desc: "Instagram, Twitter" },
  { value: "16:9", label: "Landscape", icon: Monitor, desc: "YouTube, LinkedIn" },
];

export function AspectRatioPicker({ value, onChange }: AspectRatioPickerProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {ratios.map((ratio) => (
        <button
          key={ratio.value}
          onClick={() => onChange(ratio.value)}
          className={cn(
            "flex flex-col items-center gap-2 rounded-xl p-4 transition-all duration-200 cursor-pointer",
            value === ratio.value
              ? "glass glow border-brand-500/50 bg-brand-600/10"
              : "glass glass-hover"
          )}
        >
          <div className="flex items-center justify-center">
            <div
              className={cn(
                "border-2 rounded-sm flex items-center justify-center",
                value === ratio.value
                  ? "border-brand-400"
                  : "border-surface-400"
              )}
              style={{
                width: ratio.value === "9:16" ? 24 : ratio.value === "1:1" ? 32 : 40,
                height: ratio.value === "9:16" ? 40 : ratio.value === "1:1" ? 32 : 24,
              }}
            >
              <ratio.icon
                className={cn(
                  "h-3 w-3",
                  value === ratio.value ? "text-brand-400" : "text-surface-500"
                )}
              />
            </div>
          </div>
          <div className="text-center">
            <p
              className={cn(
                "text-xs font-medium",
                value === ratio.value ? "text-brand-300" : "text-surface-600"
              )}
            >
              {ratio.label}
            </p>
            <p className="text-[10px] text-surface-500">{ratio.desc}</p>
          </div>
        </button>
      ))}
    </div>
  );
}
