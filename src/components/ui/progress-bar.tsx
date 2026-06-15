"use client";

import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  className?: string;
  animated?: boolean;
}

export function ProgressBar({
  value,
  className,
  animated = true,
}: ProgressBarProps) {
  return (
    <div
      className={cn(
        "h-2 w-full rounded-full bg-surface-200 overflow-hidden",
        className
      )}
    >
      <div
        className={cn(
          "h-full rounded-full gradient-brand transition-all duration-500",
          animated && value < 100 && "pulse-glow"
        )}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
