"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useClipContext } from "@/context/clip-context";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AspectRatioPicker } from "@/components/editor/aspect-ratio-picker";
import type { AspectRatio, SocialPlatform } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Download,
  Send,
  Check,
  Link as LinkIcon,
  ExternalLink,
  AlertCircle,
} from "lucide-react";

const platformConfig: Record<
  SocialPlatform,
  { label: string; color: string; bgColor: string }
> = {
  tiktok: { label: "TikTok", color: "text-pink-400", bgColor: "bg-pink-600/20" },
  youtube: { label: "YouTube Shorts", color: "text-red-400", bgColor: "bg-red-600/20" },
  instagram: { label: "Instagram Reels", color: "text-purple-400", bgColor: "bg-purple-600/20" },
  twitter: { label: "Twitter / X", color: "text-sky-400", bgColor: "bg-sky-600/20" },
};

export default function ExportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { getClip, socialAccounts, toggleSocialAccount } = useClipContext();
  const clip = getClip(id);

  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(
    clip?.aspectRatio || "9:16"
  );
  const [selectedPlatforms, setSelectedPlatforms] = useState<SocialPlatform[]>(
    []
  );
  const [isExporting, setIsExporting] = useState(false);
  const [exported, setExported] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  if (!clip) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-surface-500">Clip not found</p>
      </div>
    );
  }

  const togglePlatform = (platform: SocialPlatform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    );
  };

  const handleExport = async (download: boolean) => {
    setIsExporting(true);
    setExportError(null);
    try {
      const res = await fetch(`/api/clips/${id}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aspect_ratio: aspectRatio }),
      });
      const data = await res.json();
      if (!res.ok) {
        setExportError(data.error ?? "Export failed");
      } else {
        setExported(true);
        if (download) window.location.href = `/api/clips/${id}/download`;
      }
    } catch {
      setExportError("Failed to connect to export API");
    }
    setIsExporting(false);
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="text-surface-500 hover:text-surface-700 transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-surface-800">
            Export &amp; Publish
          </h1>
          <p className="text-sm text-surface-500">{clip.title}</p>
        </div>
      </div>

      <GlassCard className="space-y-4">
        <h3 className="text-sm font-medium text-surface-700">Format</h3>
        <AspectRatioPicker value={aspectRatio} onChange={setAspectRatio} />
      </GlassCard>

      <GlassCard className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-surface-700">
            Publish To
          </h3>
          <Badge variant="brand">{selectedPlatforms.length} selected</Badge>
        </div>

        <div className="space-y-2">
          {socialAccounts.map((account) => {
            const config = platformConfig[account.platform];
            const isSelected = selectedPlatforms.includes(account.platform);

            return (
              <div
                key={account.platform}
                className={cn(
                  "flex items-center justify-between rounded-xl p-4 transition-all cursor-pointer",
                  isSelected ? "glass glow" : "glass glass-hover"
                )}
                onClick={() => {
                  if (account.connected) togglePlatform(account.platform);
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-lg",
                      config.bgColor
                    )}
                  >
                    <span className={cn("text-sm font-bold", config.color)}>
                      {config.label[0]}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-surface-700">
                      {config.label}
                    </p>
                    {account.connected ? (
                      <p className="text-xs text-surface-500">
                        {account.username}
                      </p>
                    ) : (
                      <p className="text-xs text-surface-500">Not connected</p>
                    )}
                  </div>
                </div>

                {account.connected ? (
                  <div
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-md transition-all",
                      isSelected
                        ? "gradient-brand"
                        : "border border-surface-300"
                    )}
                  >
                    {isSelected && <Check className="h-3.5 w-3.5 text-white" />}
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSocialAccount(account.platform);
                    }}
                  >
                    <LinkIcon className="h-3 w-3" />
                    Connect
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </GlassCard>

      {exportError && (
        <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 px-4 py-3 text-xs text-amber-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {exportError}
        </div>
      )}

      <div className="flex gap-3">
        <Button variant="secondary" size="lg" className="flex-1 gap-2" disabled={isExporting} onClick={() => handleExport(true)}>
          <Download className="h-4 w-4" />
          {isExporting ? "Exporting…" : "Download"}
        </Button>
        <Button
          size="lg"
          className="flex-1 gap-2"
          disabled={selectedPlatforms.length === 0 || isExporting}
          onClick={() => handleExport(false)}
        >
          {isExporting ? (
            <>Publishing...</>
          ) : exported ? (
            <>
              <Check className="h-4 w-4" />
              Published!
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Publish to {selectedPlatforms.length} platform
              {selectedPlatforms.length !== 1 && "s"}
            </>
          )}
        </Button>
      </div>

      {exported && (
        <GlassCard className="glow space-y-3">
          <div className="flex items-center gap-2 text-emerald-400">
            <Check className="h-5 w-5" />
            <span className="text-sm font-medium">
              Successfully exported!
            </span>
          </div>
          <p className="text-xs text-surface-500">
            Your clip has been exported. In production, this would upload to
            your selected platforms. Check your library for the download.
          </p>
          <Button variant="ghost" size="sm" className="gap-1.5">
            <ExternalLink className="h-3.5 w-3.5" />
            View in Library
          </Button>
        </GlassCard>
      )}
    </div>
  );
}
