"use client";

import { cn } from "@/lib/utils";
import { Check, Loader2, type LucideIcon } from "lucide-react";

interface StepIndicatorProps {
  icon: LucideIcon;
  label: string;
  description: string;
  status: "pending" | "active" | "complete";
}

export function StepIndicator({
  icon: Icon,
  label,
  description,
  status,
}: StepIndicatorProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-xl p-4 transition-all duration-500",
        status === "active" && "glass glow",
        status === "complete" && "opacity-60"
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-500",
          status === "pending" && "bg-surface-200 text-surface-500",
          status === "active" && "gradient-brand text-white pulse-glow",
          status === "complete" && "bg-emerald-600/20 text-emerald-400"
        )}
      >
        {status === "complete" ? (
          <Check className="h-5 w-5" />
        ) : status === "active" ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Icon className="h-5 w-5" />
        )}
      </div>
      <div>
        <p
          className={cn(
            "text-sm font-medium",
            status === "active" ? "text-surface-900" : "text-surface-600"
          )}
        >
          {label}
        </p>
        <p className="text-xs text-surface-500">{description}</p>
      </div>
    </div>
  );
}
