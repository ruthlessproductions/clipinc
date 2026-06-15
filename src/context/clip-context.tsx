"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type {
  Clip,
  Project,
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
  uploadVideo: (file: File) => Promise<string>;
  uploadUrl: (url: string) => Promise<string>;
  refreshProjects: () => Promise<void>;
  refreshClips: () => Promise<void>;
  getClip: (id: string) => Clip | undefined;
  getProject: (id: string) => Project | undefined;
  updateClip: (id: string, updates: Partial<Clip>) => void;
  deleteClips: (ids: string[]) => Promise<void>;
  toggleSocialAccount: (platform: string) => void;
}

const ClipContext = createContext<ClipContextType | null>(null);

export function ClipProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>(mockProjects);
  const [clips, setClips] = useState<Clip[]>(mockClips);
  const [socialAccounts, setSocialAccounts] =
    useState<SocialAccount[]>(mockSocialAccounts);
  const [activeProject, setActiveProject] = useState<Project | null>(null);

  const refreshProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/projects");
      if (res.ok) {
        const data = await res.json();
        if (data.length > 0) setProjects(data);
      }
    } catch {
      // keep mock data on failure
    }
  }, []);

  const refreshClips = useCallback(async () => {
    try {
      const res = await fetch("/api/clips");
      if (res.ok) {
        const data = await res.json();
        if (data.length > 0) setClips(data);
      }
    } catch {
      // keep mock data on failure
    }
  }, []);

  useEffect(() => {
    refreshProjects();
    refreshClips();
  }, [refreshProjects, refreshClips]);

  const uploadVideo = useCallback(async (file: File): Promise<string> => {
    const form = new FormData();
    form.append("video", file);
    const res = await fetch("/api/upload", { method: "POST", body: form });
    const { id } = await res.json();
    await refreshProjects();
    return id;
  }, [refreshProjects]);

  const uploadUrl = useCallback(async (url: string): Promise<string> => {
    const form = new FormData();
    form.append("url", url);
    const res = await fetch("/api/upload", { method: "POST", body: form });
    const { id } = await res.json();
    await refreshProjects();
    return id;
  }, [refreshProjects]);

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
      fetch(`/api/clips/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      }).catch(() => {});
    },
    []
  );

  const deleteClips = useCallback(async (ids: string[]) => {
    setClips((prev) => prev.filter((c) => !ids.includes(c.id)));
    await Promise.all(ids.map((id) => fetch(`/api/clips/${id}`, { method: "DELETE" })));
  }, []);

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
        uploadVideo,
        uploadUrl,
        refreshProjects,
        refreshClips,
        getClip,
        getProject,
        updateClip,
        deleteClips,
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
