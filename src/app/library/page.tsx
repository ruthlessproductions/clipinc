"use client";

import { useState, useMemo } from "react";
import { useClipContext } from "@/context/clip-context";
import { ClipCard } from "@/components/library/clip-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ClipStatus } from "@/lib/types";
import { Search, Film, CheckSquare, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";

const filters: { label: string; value: ClipStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Ready", value: "ready" },
  { label: "Exported", value: "exported" },
  { label: "Published", value: "published" },
];

export default function LibraryPage() {
  const { clips, deleteClips } = useClipContext();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ClipStatus | "all">("all");
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    let result = clips;
    if (filter !== "all") result = result.filter((c) => c.status === filter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) => c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)
      );
    }
    return result;
  }, [clips, filter, search]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((c) => c.id)));
    }
  };

  const handleDelete = async () => {
    await deleteClips([...selected]);
    setSelected(new Set());
    setSelecting(false);
  };

  const exitSelect = () => {
    setSelecting(false);
    setSelected(new Set());
  };

  return (
    <div className="px-6 py-10 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold gradient-brand-text">My Clips</h1>
          <p className="mt-1 text-sm text-surface-500">
            {clips.length} clips across all projects
          </p>
        </div>
        {!selecting ? (
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setSelecting(true)}>
            <CheckSquare className="h-4 w-4" />
            Select
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={handleSelectAll}
              className="text-xs text-surface-500 hover:text-surface-700 transition-colors cursor-pointer"
            >
              {selected.size === filtered.length ? "Deselect all" : "Select all"}
            </button>
            {selected.size > 0 && (
              <Button size="sm" className="gap-2 bg-red-600/80 hover:bg-red-600 text-white border-0" onClick={handleDelete}>
                <Trash2 className="h-3.5 w-3.5" />
                Delete {selected.size}
              </Button>
            )}
            <button onClick={exitSelect} className="text-surface-500 hover:text-surface-700 transition-colors cursor-pointer">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clips..."
            className="h-10 w-full rounded-xl border border-surface-300 bg-surface-100/50 pl-9 pr-4 text-sm text-surface-800 placeholder:text-surface-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/50 transition-all"
          />
        </div>
        <div className="flex gap-1">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer",
                filter === f.value
                  ? "bg-brand-600/20 text-brand-300"
                  : "text-surface-500 hover:text-surface-700 hover:bg-surface-200/50"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-200 mb-4">
            <Film className="h-8 w-8 text-surface-400" />
          </div>
          <p className="text-sm text-surface-500">No clips found</p>
          <p className="text-xs text-surface-400 mt-1">
            {search ? "Try a different search term" : "Upload a video to get started"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((clip) => (
            <ClipCard
              key={clip.id}
              clip={clip}
              selecting={selecting}
              selected={selected.has(clip.id)}
              onToggle={toggleSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}
