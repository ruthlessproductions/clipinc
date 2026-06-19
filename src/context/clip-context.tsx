"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
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
import { UndoToastStack, type PendingDelete } from "@/components/ui/undo-toast";

const UNDO_WINDOW_MS = 8000;

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
  refreshSocialAccounts: () => Promise<void>;
  disconnectAccount: (platform: string) => Promise<void>;
  getClip: (id: string) => Clip | undefined;
  getProject: (id: string) => Project | undefined;
  updateClip: (id: string, updates: Partial<Clip>) => void;
  deleteClips: (ids: string[]) => Promise<void>;
  deleteProjects: (ids: string[]) => Promise<void>;
  toggleSocialAccount: (platform: string) => void;
}

const ClipContext = createContext<ClipContextType | null>(null);

export function ClipProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>(mockProjects);
  const [clips, setClips] = useState<Clip[]>(mockClips);
  const [socialAccounts, setSocialAccounts] =
    useState<SocialAccount[]>(mockSocialAccounts);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [pendingDeletes, setPendingDeletes] = useState<PendingDelete[]>([]);
  const undoersRef = useRef<Map<string, () => void>>(new Map());
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

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

  const refreshSocialAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/social/accounts");
      if (res.ok) {
        const data = await res.json();
        setSocialAccounts(data);
      }
    } catch {}
  }, []);

  const disconnectAccount = useCallback(async (platform: string) => {
    await fetch(`/api/social/${platform}/disconnect`, { method: "POST" });
    await refreshSocialAccounts();
  }, [refreshSocialAccounts]);

  useEffect(() => {
    refreshProjects();
    refreshClips();
    refreshSocialAccounts();
  }, [refreshProjects, refreshClips, refreshSocialAccounts]);

  // Poll for scheduled clips every 60 seconds while the app is open
  useEffect(() => {
    const interval = setInterval(() => {
      fetch("/api/social/scheduled-check", { method: "POST" }).catch(() => {});
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

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

  // Schedules a delete that can be undone within UNDO_WINDOW_MS. The item is
  // removed from local state immediately; the API call only fires once the
  // window elapses without the user clicking Undo.
  const scheduleDelete = useCallback(
    (message: string, undo: () => void, commit: () => Promise<void>) => {
      const id = `${Date.now()}-${Math.random()}`;
      undoersRef.current.set(id, undo);
      setPendingDeletes((prev) => [...prev, { id, message, durationMs: UNDO_WINDOW_MS }]);
      const timeoutId = setTimeout(() => {
        timersRef.current.delete(id);
        undoersRef.current.delete(id);
        setPendingDeletes((prev) => prev.filter((p) => p.id !== id));
        commit().catch(() => {});
      }, UNDO_WINDOW_MS);
      timersRef.current.set(id, timeoutId);
    },
    []
  );

  const undoPendingDelete = useCallback((id: string) => {
    const timeoutId = timersRef.current.get(id);
    if (timeoutId) clearTimeout(timeoutId);
    timersRef.current.delete(id);
    const undo = undoersRef.current.get(id);
    undoersRef.current.delete(id);
    undo?.();
    setPendingDeletes((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const deleteClips = useCallback(async (ids: string[]) => {
    setClips((prevClips) => {
      const removed = prevClips.filter((c) => ids.includes(c.id));
      scheduleDelete(
        `${removed.length} ${removed.length === 1 ? "clip" : "clips"} deleted`,
        () => setClips((prev) => [...prev, ...removed]),
        async () => {
          await Promise.all(ids.map((id) => fetch(`/api/clips/${id}`, { method: "DELETE" })));
        }
      );
      return prevClips.filter((c) => !ids.includes(c.id));
    });
  }, [scheduleDelete]);

  const deleteProjects = useCallback(async (ids: string[]) => {
    setProjects((prev) => prev.filter((p) => !ids.includes(p.id)));
    setClips((prev) => prev.filter((c) => !ids.includes(c.projectId)));
    await Promise.all(ids.map((id) => fetch(`/api/projects/${id}`, { method: "DELETE" })));
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
        refreshSocialAccounts,
        disconnectAccount,
        getClip,
        getProject,
        updateClip,
        deleteClips,
        deleteProjects,
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
