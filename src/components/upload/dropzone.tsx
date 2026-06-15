"use client";

import { useCallback, useState } from "react";
import { Upload, Film } from "lucide-react";
import { cn } from "@/lib/utils";

interface DropzoneProps {
  onFileSelected: (file: File) => void;
}

export function Dropzone({ onFileSelected }: DropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files?.length) {
        onFileSelected(files[0]);
      }
    },
    [onFileSelected]
  );

  return (
    <div
      onDragEnter={handleDragIn}
      onDragLeave={handleDragOut}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      className={cn(
        "relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-12 transition-all duration-300 cursor-pointer group",
        isDragging
          ? "border-brand-400 bg-brand-600/10 glow-strong"
          : "border-surface-300 hover:border-brand-500/50 hover:bg-surface-100/50"
      )}
      onClick={() => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "video/*";
        input.onchange = (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file) onFileSelected(file);
        };
        input.click();
      }}
    >
      <div
        className={cn(
          "mb-4 flex h-16 w-16 items-center justify-center rounded-2xl transition-all duration-300",
          isDragging
            ? "gradient-brand glow-strong"
            : "bg-surface-200 group-hover:bg-brand-600/20"
        )}
      >
        {isDragging ? (
          <Film className="h-8 w-8 text-white" />
        ) : (
          <Upload className="h-8 w-8 text-surface-500 group-hover:text-brand-400" />
        )}
      </div>

      <p className="mb-1 text-base font-medium text-surface-700">
        {isDragging ? "Drop your video here" : "Drag & drop your video"}
      </p>
      <p className="text-sm text-surface-500">
        MP4, MOV, AVI up to 2GB
      </p>

      {isDragging && (
        <div className="absolute inset-0 rounded-2xl bg-brand-500/5 pointer-events-none" />
      )}
    </div>
  );
}
