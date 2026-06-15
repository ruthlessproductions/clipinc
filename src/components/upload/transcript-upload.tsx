"use client";

import { useState } from "react";
import { FileText, Upload, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TranscriptUploadProps {
  projectId: string | null;
  onUploaded: () => void;
}

export function TranscriptUpload({ projectId, onUploaded }: TranscriptUploadProps) {
  const [mode, setMode] = useState<"file" | "paste">("file");
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [dragging, setDragging] = useState(false);

  const handleFileSelect = async (file: File) => {
    if (!projectId) return;
    setUploading(true);
    const form = new FormData();
    form.append("transcript", file);
    await fetch(`/api/projects/${projectId}/transcript`, {
      method: "POST",
      body: form,
    });
    setUploading(false);
    setDone(true);
    onUploaded();
  };

  const handlePaste = async () => {
    if (!projectId || !text.trim()) return;
    setUploading(true);
    await fetch(`/api/projects/${projectId}/transcript`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    setUploading(false);
    setDone(true);
    onUploaded();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium text-surface-700">
        <FileText className="h-4 w-4" />
        Transcript
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setMode("file")}
          className={cn(
            "rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer",
            mode === "file"
              ? "bg-brand-600/20 text-brand-300"
              : "text-surface-500 hover:text-surface-700 hover:bg-surface-200/50"
          )}
        >
          Upload File
        </button>
        <button
          onClick={() => setMode("paste")}
          className={cn(
            "rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer",
            mode === "paste"
              ? "bg-brand-600/20 text-brand-300"
              : "text-surface-500 hover:text-surface-700 hover:bg-surface-200/50"
          )}
        >
          Paste Text
        </button>
      </div>

      {done ? (
        <div className="flex items-center gap-2 rounded-xl p-4 glass text-emerald-400">
          <Check className="h-5 w-5" />
          <span className="text-sm font-medium">Transcript uploaded</span>
        </div>
      ) : mode === "file" ? (
        <div
          className={cn(
            "flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 cursor-pointer transition-all",
            dragging ? "border-brand-500 bg-brand-500/5" : "border-surface-300 hover:border-brand-500/50"
          )}
          onClick={() => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = ".srt,.vtt,.txt,.text";
            input.onchange = (e) => {
              const f = (e.target as HTMLInputElement).files?.[0];
              if (f) handleFileSelect(f);
            };
            input.click();
          }}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragEnter={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const f = e.dataTransfer.files?.[0];
            if (f) handleFileSelect(f);
          }}
        >
          <Upload className="h-6 w-6 text-surface-500 mb-2" />
          <p className="text-sm text-surface-600">
            {uploading ? "Uploading..." : dragging ? "Drop to upload" : "Drop an SRT, VTT, or TXT file"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste your transcript here..."
            rows={6}
            className="w-full rounded-xl border border-surface-300 bg-surface-100/50 p-3 text-sm text-surface-800 placeholder:text-surface-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/50 resize-none"
          />
          <Button
            onClick={handlePaste}
            disabled={!text.trim() || uploading}
            size="sm"
          >
            {uploading ? "Uploading..." : "Submit Transcript"}
          </Button>
        </div>
      )}
    </div>
  );
}
