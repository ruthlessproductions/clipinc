"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Caption } from "@/lib/types";
import { formatDuration } from "@/lib/utils";
import { Type, Pencil, Check } from "lucide-react";

interface CaptionEditorProps {
  captions: Caption[];
  onUpdate: (captions: Caption[]) => void;
}

export function CaptionEditor({ captions, onUpdate }: CaptionEditorProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const startEdit = (caption: Caption) => {
    setEditingId(caption.id);
    setEditText(caption.text);
  };

  const saveEdit = (id: string) => {
    onUpdate(
      captions.map((c) => (c.id === id ? { ...c, text: editText } : c))
    );
    setEditingId(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-surface-700">
        <Type className="h-4 w-4" />
        Captions
      </div>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {captions.map((caption) => (
          <div
            key={caption.id}
            className={cn(
              "flex items-start gap-3 rounded-lg p-3 transition-all",
              editingId === caption.id ? "glass glow" : "glass glass-hover"
            )}
          >
            <span className="shrink-0 text-[10px] text-surface-500 mt-0.5 font-mono">
              {formatDuration(caption.startTime)}
            </span>
            {editingId === caption.id ? (
              <div className="flex-1 flex items-center gap-2">
                <input
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="flex-1 bg-transparent text-sm text-surface-800 outline-none"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && saveEdit(caption.id)}
                />
                <button
                  onClick={() => saveEdit(caption.id)}
                  className="text-brand-400 hover:text-brand-300 cursor-pointer"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex-1 flex items-center gap-2">
                <span className="flex-1 text-sm text-surface-700">
                  {caption.text}
                </span>
                <button
                  onClick={() => startEdit(caption)}
                  className="text-surface-500 hover:text-surface-700 opacity-0 group-hover:opacity-100 cursor-pointer"
                >
                  <Pencil className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
