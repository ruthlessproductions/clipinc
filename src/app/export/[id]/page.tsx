"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useClipContext } from "@/context/clip-context";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AspectRatioPicker } from "@/components/editor/aspect-ratio-picker";
import { CaptionStylePicker } from "@/components/editor/caption-style-picker";
import type { CaptionStyleId } from "@/lib/captions";
import type { AspectRatio, SocialPlatform } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Download,
  Send,
  Clock,
  Check,
  Link as LinkIcon,
  ExternalLink,
  AlertCircle,
  Loader2,
  CalendarClock,
} from "lucide-react";

const platformConfig: Record<
  SocialPlatform,
  { label: string; color: string; bgColor: string }
> = {
  tiktok:    { label: "TikTok",            color: "text-pink-400",   bgColor: "bg-pink-600/20"   },
  youtube:   { label: "YouTube Shorts",    color: "text-red-400",    bgColor: "bg-red-600/20"    },
  instagram: { label: "Instagram Reels",   color: "text-purple-400", bgColor: "bg-purple-600/20" },
  twitter:   { label: "Twitter / X",       color: "text-sky-400",    bgColor: "bg-sky-600/20"    },
};

// Returns a datetime-local string defaulting to 1 hour from now
function defaultScheduleTime() {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  d.setSeconds(0, 0);
  return d.toISOString().slice(0, 16);
}

export default function ExportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { getClip, socialAccounts } = useClipContext();
  const clip = getClip(id);

  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(clip?.aspectRatio || "9:16");
  const [selectedPlatforms, setSelectedPlatforms] = useState<SocialPlatform[]>([]);
  const [publishMode, setPublishMode] = useState<"now" | "schedule">("now");
  const [scheduleTime, setScheduleTime] = useState(defaultScheduleTime);
  const [isWorking, setIsWorking] = useState(false);
  const [publishResults, setPublishResults] = useState<Record<string, { success: boolean; url?: string; error?: string }> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scheduled, setScheduled] = useState(false);
  const [captionStyle, setCaptionStyle] = useState<CaptionStyleId | null>(null);

  if (!clip) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-surface-500">Clip not found</p>
      </div>
    );
  }

  const togglePlatform = (platform: SocialPlatform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform]
    );
  };

  const ensureExported = async (): Promise<boolean> => {
    const res = await fetch(`/api/clips/${id}/export`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aspect_ratio: aspectRatio, caption_style: captionStyle }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Export failed");
      return false;
    }
    return true;
  };

  const handleDownload = async () => {
    setIsWorking(true);
    setError(null);
    try {
      const ok = await ensureExported();
      if (ok) window.location.href = `/api/clips/${id}/download`;
    } catch {
      setError("Failed to connect to export API");
    }
    setIsWorking(false);
  };

  const handlePublishNow = async () => {
    setIsWorking(true);
    setError(null);
    setPublishResults(null);
    try {
      const ok = await ensureExported();
      if (!ok) { setIsWorking(false); return; }

      const res = await fetch("/api/social/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clip_id: id,
          platforms: selectedPlatforms,
          title: clip.title,
          description: clip.description,
        }),
      });
      const data = await res.json();
      setPublishResults(data.results);
    } catch {
      setError("Failed to connect to publish API");
    }
    setIsWorking(false);
  };

  const handleSchedule = async () => {
    if (!scheduleTime || selectedPlatforms.length === 0) return;
    setIsWorking(true);
    setError(null);
    try {
      // Export the file now so it's ready when the schedule fires
      const ok = await ensureExported();
      if (!ok) { setIsWorking(false); return; }

      const res = await fetch(`/api/clips/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduled_publish_at: new Date(scheduleTime).toISOString(),
          scheduled_platforms: JSON.stringify(selectedPlatforms),
        }),
      });
      if (!res.ok) {
        setError("Failed to save schedule");
      } else {
        setScheduled(true);
      }
    } catch {
      setError("Failed to connect to API");
    }
    setIsWorking(false);
  };

  const connectedAccounts = socialAccounts.filter((a) => a.connected);

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
          <h1 className="text-xl font-bold text-surface-800">Export &amp; Publish</h1>
          <p className="text-sm text-surface-500">{clip.title}</p>
        </div>
      </div>

      {/* Format */}
      <GlassCard className="space-y-4">
        <h3 className="text-sm font-medium text-surface-700">Format</h3>
        <AspectRatioPicker value={aspectRatio} onChange={setAspectRatio} />
      </GlassCard>

      {/* Captions */}
      <GlassCard className="space-y-4">
        <CaptionStylePicker value={captionStyle} onChange={setCaptionStyle} />
      </GlassCard>

      {/* Platform selector */}
      <GlassCard className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-surface-700">Publish To</h3>
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
                  "flex items-center justify-between rounded-xl p-4 transition-all",
                  account.connected ? "cursor-pointer" : "opacity-60",
                  isSelected ? "glass glow" : "glass glass-hover"
                )}
                onClick={() => { if (account.connected) togglePlatform(account.platform); }}
              >
                <div className="flex items-center gap-3">
                  <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", config.bgColor)}>
                    <span className={cn("text-sm font-bold", config.color)}>{config.label[0]}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-surface-700">{config.label}</p>
                    <p className="text-xs text-surface-500">
                      {account.connected ? (account.username ?? "Connected") : "Not connected"}
                    </p>
                  </div>
                </div>

                {account.connected ? (
                  <div className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-md transition-all",
                    isSelected ? "gradient-brand" : "border border-surface-300"
                  )}>
                    {isSelected && <Check className="h-3.5 w-3.5 text-white" />}
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.location.href = `/api/social/${account.platform}/connect`;
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

      {/* Publish mode toggle */}
      {selectedPlatforms.length > 0 && (
        <div className="flex rounded-xl border border-surface-200 overflow-hidden">
          <button
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors",
              publishMode === "now"
                ? "gradient-brand text-white"
                : "bg-surface-100/50 text-surface-500 hover:text-surface-700"
            )}
            onClick={() => setPublishMode("now")}
          >
            <Send className="h-3.5 w-3.5" />
            Publish Now
          </button>
          <button
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors",
              publishMode === "schedule"
                ? "gradient-brand text-white"
                : "bg-surface-100/50 text-surface-500 hover:text-surface-700"
            )}
            onClick={() => setPublishMode("schedule")}
          >
            <CalendarClock className="h-3.5 w-3.5" />
            Schedule
          </button>
        </div>
      )}

      {/* Schedule picker */}
      {selectedPlatforms.length > 0 && publishMode === "schedule" && (
        <GlassCard className="space-y-3">
          <label className="text-xs text-surface-500 uppercase tracking-wide">Publish at</label>
          <input
            type="datetime-local"
            value={scheduleTime}
            min={new Date().toISOString().slice(0, 16)}
            onChange={(e) => setScheduleTime(e.target.value)}
            className="w-full rounded-xl border border-surface-300 bg-surface-100/50 px-3 py-2 text-sm text-surface-800 focus:border-brand-500 focus:outline-none"
          />
          <p className="text-xs text-surface-500">
            The clip will be exported now and published automatically at the scheduled time.
            The app needs to be running when the time arrives.
          </p>
        </GlassCard>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 px-4 py-3 text-xs text-amber-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        {publishMode === "now" ? (
          <Button
            size="lg"
            className="flex-1 gap-2"
            disabled={selectedPlatforms.length === 0 || isWorking}
            onClick={handlePublishNow}
          >
            {isWorking
              ? <><Loader2 className="h-4 w-4 animate-spin" />Publishing…</>
              : <><Send className="h-4 w-4" />Publish to {selectedPlatforms.length} platform{selectedPlatforms.length !== 1 ? "s" : ""}</>
            }
          </Button>
        ) : (
          <Button
            size="lg"
            className="flex-1 gap-2"
            disabled={selectedPlatforms.length === 0 || isWorking || scheduled}
            onClick={handleSchedule}
          >
            {isWorking
              ? <><Loader2 className="h-4 w-4 animate-spin" />Saving…</>
              : scheduled
              ? <><Check className="h-4 w-4" />Scheduled!</>
              : <><Clock className="h-4 w-4" />Schedule</>
            }
          </Button>
        )}
      </div>

      {scheduled && (
        <GlassCard className="space-y-2">
          <div className="flex items-center gap-2 text-emerald-400">
            <CalendarClock className="h-4 w-4" />
            <span className="text-sm font-medium">Scheduled successfully</span>
          </div>
          <p className="text-xs text-surface-500">
            Will publish to {selectedPlatforms.map(p => platformConfig[p].label).join(", ")} at{" "}
            {new Date(scheduleTime).toLocaleString()}.
            Keep the app running — it checks for due posts every minute.
          </p>
        </GlassCard>
      )}

      {publishResults && (
        <GlassCard className="space-y-3">
          <p className="text-sm font-medium text-surface-700">Publish results</p>
          {Object.entries(publishResults).map(([platform, result]) => (
            <div key={platform} className="flex items-start gap-2">
              {result.success
                ? <Check className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                : <AlertCircle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
              }
              <div className="min-w-0">
                <p className={`text-xs font-medium ${result.success ? "text-emerald-400" : "text-surface-600"}`}>
                  {platformConfig[platform as SocialPlatform]?.label ?? platform}
                  {result.success ? " — posted!" : ""}
                </p>
                {result.url && (
                  <a href={result.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-brand-400 hover:underline mt-0.5">
                    View post <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                {result.error && <p className="text-xs text-surface-500 mt-0.5">{result.error}</p>}
              </div>
            </div>
          ))}
        </GlassCard>
      )}
    </div>
  );
}
