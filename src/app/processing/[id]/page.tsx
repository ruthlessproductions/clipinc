"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useClipContext } from "@/context/clip-context";
import { GlassCard } from "@/components/ui/glass-card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StepIndicator } from "@/components/processing/step-indicator";
import { Button } from "@/components/ui/button";
import type { ProcessingStep } from "@/lib/types";
import {
  Upload,
  FileText,
  Brain,
  Wand2,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

const steps: {
  key: ProcessingStep;
  label: string;
  description: string;
  icon: typeof Upload;
}[] = [
  {
    key: "uploading",
    label: "Uploading Video",
    description: "Transferring your video to our servers",
    icon: Upload,
  },
  {
    key: "transcribing",
    label: "Transcribing Audio",
    description: "Converting speech to text with AI",
    icon: FileText,
  },
  {
    key: "analyzing",
    label: "Analyzing Content",
    description: "Finding the most engaging moments",
    icon: Brain,
  },
  {
    key: "generating",
    label: "Generating Clips",
    description: "Creating optimized short-form clips",
    icon: Wand2,
  },
  {
    key: "complete",
    label: "Complete",
    description: "Your clips are ready to review",
    icon: CheckCircle2,
  },
];

function getStepStatus(
  currentStep: ProcessingStep,
  stepKey: ProcessingStep
): "pending" | "active" | "complete" {
  const currentIdx = steps.findIndex((s) => s.key === currentStep);
  const stepIdx = steps.findIndex((s) => s.key === stepKey);
  if (stepIdx < currentIdx) return "complete";
  if (stepIdx === currentIdx) return currentStep === "complete" ? "complete" : "active";
  return "pending";
}

export default function ProcessingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { getProject } = useClipContext();
  const project = getProject(id);

  if (!project) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-surface-500">Project not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 space-y-8">
      <div>
        <h1 className="text-2xl font-bold gradient-brand-text">Processing</h1>
        <p className="mt-1 text-sm text-surface-500 truncate">
          {project.title}
        </p>
      </div>

      <GlassCard className="space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-surface-600">Overall Progress</span>
            <span className="text-brand-400 font-medium">
              {Math.round(project.processingProgress)}%
            </span>
          </div>
          <ProgressBar value={project.processingProgress} />
        </div>

        <div className="space-y-1">
          {steps.map((step) => (
            <StepIndicator
              key={step.key}
              icon={step.icon}
              label={step.label}
              description={step.description}
              status={getStepStatus(project.processingStep, step.key)}
            />
          ))}
        </div>

        {project.processingStep === "complete" && (
          <div className="pt-2">
            <Button
              onClick={() => router.push("/library")}
              size="lg"
              className="w-full gap-2"
            >
              View Your Clips
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
