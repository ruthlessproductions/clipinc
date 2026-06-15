"use client";

import { useState } from "react";
import { Link, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UrlInputProps {
  onSubmit: (url: string) => void;
}

export function UrlInput({ onSubmit }: UrlInputProps) {
  const [url, setUrl] = useState("");

  const isValidUrl =
    url.includes("youtube.com/watch") ||
    url.includes("youtu.be/") ||
    url.includes("vimeo.com/");

  return (
    <div className="flex gap-3">
      <div className="relative flex-1">
        <Link className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-500" />
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste a YouTube or Vimeo URL..."
          className="h-12 w-full rounded-xl border border-surface-300 bg-surface-100/50 pl-10 pr-4 text-sm text-surface-800 placeholder:text-surface-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/50 transition-all"
        />
      </div>
      <Button
        disabled={!isValidUrl}
        onClick={() => onSubmit(url)}
        size="lg"
        className="gap-2"
      >
        Process
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
