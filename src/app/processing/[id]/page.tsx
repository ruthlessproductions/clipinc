"use client";

import { use, useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useClipContext } from "@/context/clip-context";
import { GlassCard } from "@/components/ui/glass-card";
import { TranscriptUpload } from "@/components/upload/transcript-upload";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Upload,
  FileText,
  Brain,
  Wand2,
  CheckCircle2,
  ArrowRight,
  Play,
  AlertCircle,
  Check,
  Loader2,
  SkipForward,
} from "lucide-react";

type StepView = "uploading" | "transcript" | "analyze" | "running" | "complete";

const TRAIL = [
  { key: "uploading", label: "Upload", icon: Upload },
  { key: "transcript", label: "Transcript", icon: FileText },
  { key: "analyze", label: "Analyze", icon: Brain },
  { key: "running", label: "Generate", icon: Wand2 },
  { key: "complete", label: "Done", icon: CheckCircle2 },
] as const;

const TRAIL_ORDER = TRAIL.map((t) => t.key);

function getView(processingStep: string, transcriptReady: boolean): StepView {
  if (processingStep === "complete") return "complete";
  if (processingStep === "generating" || processingStep === "analyzing") return "running";
  if (processingStep === "transcribing" && !transcriptReady) return "transcript";
  return "analyze";
}

function trailStatus(viewKey: string, currentView: StepView): "pending" | "active" | "complete" {
  const currentIdx = TRAIL_ORDER.indexOf(currentView as typeof TRAIL_ORDER[number]);
  const keyIdx = TRAIL_ORDER.indexOf(viewKey as typeof TRAIL_ORDER[number]);
  if (keyIdx < currentIdx) return "complete";
  if (keyIdx === currentIdx) return "active";
  return "pending";
}

export default function ProcessingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { getProject, refreshProjects, refreshClips } = useClipContext();
  const project = getProject(id);

  const [transcriptReady, setTranscriptReady] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  useEffect(() => stopPolling, [stopPolling]);

  const runAnalysis = useCallback(async () => {
    setRunning(true);
    setError(null);
    stopPolling();
    pollRef.current = setInterval(() => refreshProjects(), 2000);
    try {
      const res = await fetch(`/api/projects/${id}/process`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        await refreshProjects();
      } else {
        await refreshProjects();
        await refreshClips();
      }
    } catch {
      setError("Failed to connect to the processing API");
    }
    stopPolling();
    setRunning(false);
  }, [id, refreshProjects, refreshClips, stopPolling]);

  if (!project) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-surface-500">Project not found</p>
      </div>
    );
  }

  const view = getView(project.processingStep, transcriptReady);

  return (
    <div className="max-w-xl mx-auto px-6 py-10 space-y-8">
      <div>
        <h1 className="text-2xl font-bold gradient-brand-text">Processing</h1>
        <p className="mt-1 text-sm text-surface-500 truncate">{project.title}</p>
      </div>

      {/* Step trail */}
      <div className="flex items-center gap-0">
        {TRAIL.map((step, i) => {
          const status = trailStatus(step.key, view);
          return (
            <div key={step.key} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1">
                <div className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full transition-all duration-500 text-xs font-medium",
                  status === "complete" && "bg-emerald-600/20 text-emerald-400",
                  status === "active" && "gradient-brand text-white pulse-glow",
                  status === "pending" && "bg-surface-200 text-surface-500",
                )}>
                  {status === "complete" ? <Check className="h-3.5 w-3.5" /> :
                   status === "active" && (view === "running") ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> :
                   <span>{i + 1}</span>}
                </div>
                <span className={cn(
                  "text-[10px] font-medium whitespace-nowrap",
                  status === "active" ? "text-brand-400" : "text-surface-500"
                )}>{step.label}</span>
              </div>
              {i < TRAIL.length - 1 && (
                <div className={cn(
                  "h-px flex-1 mx-1 mb-4 transition-all duration-500",
                  trailStatus(TRAIL[i + 1].key, view) !== "pending" ? "bg-brand-500/40" : "bg-surface-200"
                )} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step content */}
      {view === "uploading" && (
        <GlassCard className="space-y-4 text-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-brand-400 mx-auto" />
          <p className="text-sm text-surface-600">Saving video to local storage…</p>
        </GlassCard>
      )}

      {view === "transcript" && (
        <GlassCard className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-surface-800">Add a Transcript</h2>
            <p className="mt-1 text-sm text-surface-500">
              Upload an SRT, VTT, or plain text file — or paste it directly. Skip if you don't have one.
            </p>
          </div>
          <TranscriptUpload
            projectId={id}
            onUploaded={async () => {
              await refreshProjects();
              setTranscriptReady(true);
              setError(null);
            }}
          />
          <button
            onClick={() => setTranscriptReady(true)}
            className="flex items-center gap-1.5 text-xs text-surface-500 hover:text-surface-700 transition-colors cursor-pointer"
          >
            <SkipForward className="h-3.5 w-3.5" />
            Skip this step
          </button>
        </GlassCard>
      )}

      {view === "analyze" && (
        <GlassCard className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-surface-800">Analyze Content</h2>
            <p className="mt-1 text-sm text-surface-500">
              oMLX will scan the transcript and find the most engaging, clip-worthy moments.
            </p>
          </div>
          {error && (
            <div className="flex items-start gap-2 rounded-xl bg-amber-500/10 p-3">
              <AlertCircle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
              <p className="text-xs text-surface-500">{error}</p>
            </div>
          )}
          <Button onClick={runAnalysis} disabled={running} size="lg" className="w-full gap-2">
            <Play className="h-4 w-4" />
            Start AI Analysis
          </Button>
        </GlassCard>
      )}

      {view === "running" && (
        <GlassCard className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-surface-800">
              {project.processingStep === "analyzing" ? "Analyzing Content" : "Generating Clips"}
            </h2>
            <p className="mt-1 text-sm text-surface-500">
              {project.processingStep === "analyzing"
                ? "oMLX is finding the most engaging moments…"
                : "Creating your optimized short-form clips…"}
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm text-surface-500">
            <Loader2 className="h-4 w-4 animate-spin text-brand-400" />
            <span>This may take a minute</span>
          </div>
        </GlassCard>
      )}

      {view === "complete" && (
        <GlassCard className="space-y-6 text-center py-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600/20 text-emerald-400 mx-auto">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-surface-800">Your clips are ready</h2>
            <p className="mt-1 text-sm text-surface-500">Head to the library to review and export.</p>
          </div>
          <Button onClick={() => router.push("/library")} size="lg" className="w-full gap-2">
            View Your Clips
            <ArrowRight className="h-4 w-4" />
          </Button>
        </GlassCard>
      )}
    </div>
  );
}
