"use client";

import { useRouter } from "next/navigation";
import { Dropzone } from "@/components/upload/dropzone";
import { UrlInput } from "@/components/upload/url-input";
import { GlassCard } from "@/components/ui/glass-card";
import { useClipContext } from "@/context/clip-context";
import { Film, Clock, Sparkles } from "lucide-react";
import { formatDuration, formatTimeAgo } from "@/lib/utils";
import Link from "next/link";

export default function UploadPage() {
  const router = useRouter();
  const { projects, uploadVideo, uploadUrl } = useClipContext();

  const handleFile = async (file: File) => {
    const id = await uploadVideo(file);
    router.push(`/processing/${id}`);
  };

  const handleUrl = async (url: string) => {
    const id = await uploadUrl(url);
    router.push(`/processing/${id}`);
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">
      <div>
        <h1 className="text-2xl font-bold gradient-brand-text">
          Create Clips
        </h1>
        <p className="mt-1 text-sm text-surface-500">
          Upload a video or paste a URL to get started
        </p>
      </div>

      <GlassCard className="space-y-6">
        <Dropzone onFileSelected={handleFile} />
        <div className="flex items-center gap-4">
          <div className="h-px flex-1 bg-surface-200" />
          <span className="text-xs text-surface-500">or paste a link</span>
          <div className="h-px flex-1 bg-surface-200" />
        </div>
        <UrlInput onSubmit={handleUrl} />
      </GlassCard>

      {projects.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-surface-600">
            Recent Projects
          </h2>
          <div className="space-y-2">
            {projects.slice(0, 5).map((project) => (
              <Link
                key={project.id}
                href={
                  project.processingStep === "complete"
                    ? `/library`
                    : `/processing/${project.id}`
                }
              >
                <div className="glass glass-hover rounded-xl px-4 py-3 flex items-center gap-4 cursor-pointer">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-200">
                    <Film className="h-4 w-4 text-surface-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-surface-700 truncate">
                      {project.title}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-surface-500">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDuration(project.duration)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        {project.clips?.length ?? 0} clips
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] text-surface-500">
                    {formatTimeAgo(project.createdAt)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
