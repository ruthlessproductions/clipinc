"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import type {
  Clip,
  Project,
  ProcessingStep,
  SocialAccount,
} from "@/lib/types";
import {
  mockClips,
  mockProjects,
  mockSocialAccounts,
} from "@/lib/mock-data";

interface ClipContextType {
  projects: Project[];
  clips: Clip[];
  socialAccounts: SocialAccount[];
  activeProject: Project | null;
  setActiveProject: (project: Project | null) => void;
  startProcessing: (title: string, source: string) => string;
  getClip: (id: string) => Clip | undefined;
  getProject: (id: string) => Project | undefined;
  updateClip: (id: string, updates: Partial<Clip>) => void;
  toggleSocialAccount: (platform: string) => void;
}

const ClipContext = createContext<ClipContextType | null>(null);

export function ClipProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>(mockProjects);
  const [clips, setClips] = useState<Clip[]>(mockClips);
  const [socialAccounts, setSocialAccounts] =
    useState<SocialAccount[]>(mockSocialAccounts);
  const [activeProject, setActiveProject] = useState<Project | null>(null);

  const startProcessing = useCallback(
    (title: string, source: string): string => {
      const id = `proj-${Date.now()}`;
      const steps: ProcessingStep[] = [
        "uploading",
        "transcribing",
        "analyzing",
        "generating",
        "complete",
      ];

      const newProject: Project = {
        id,
        title,
        sourceUrl: source.startsWith("http") ? source : undefined,
        fileName: !source.startsWith("http") ? source : undefined,
        duration: 0,
        processingStep: "uploading",
        processingProgress: 0,
        clips: [],
        createdAt: new Date().toISOString(),
      };

      setProjects((prev) => [newProject, ...prev]);

      let stepIndex = 0;
      const advance = () => {
        if (stepIndex >= steps.length - 1) return;
        stepIndex++;
        setProjects((prev) =>
          prev.map((p) =>
            p.id === id
              ? {
                  ...p,
                  processingStep: steps[stepIndex],
                  processingProgress: (stepIndex / (steps.length - 1)) * 100,
                }
              : p
          )
        );
        if (stepIndex < steps.length - 1) {
          setTimeout(advance, 2000 + Math.random() * 1500);
        }
      };

      setTimeout(advance, 1500);
      return id;
    },
    []
  );

  const getClip = useCallback(
    (id: string) => clips.find((c) => c.id === id),
    [clips]
  );

  const getProject = useCallback(
    (id: string) => projects.find((p) => p.id === id),
    [projects]
  );

  const updateClip = useCallback(
    (id: string, updates: Partial<Clip>) => {
      setClips((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
      );
    },
    []
  );

  const toggleSocialAccount = useCallback((platform: string) => {
    setSocialAccounts((prev) =>
      prev.map((a) =>
        a.platform === platform
          ? {
              ...a,
              connected: !a.connected,
              username: !a.connected ? `@clipinc_${platform}` : undefined,
            }
          : a
      )
    );
  }, []);

  return (
    <ClipContext.Provider
      value={{
        projects,
        clips,
        socialAccounts,
        activeProject,
        setActiveProject,
        startProcessing,
        getClip,
        getProject,
        updateClip,
        toggleSocialAccount,
      }}
    >
      {children}
    </ClipContext.Provider>
  );
}

export function useClipContext() {
  const ctx = useContext(ClipContext);
  if (!ctx) throw new Error("useClipContext must be used within ClipProvider");
  return ctx;
}
