"use client";

import { useEffect, useState } from "react";
import { Undo2 } from "lucide-react";

export interface PendingDelete {
  id: string;
  message: string;
  durationMs: number;
}

function ToastBar({ durationMs }: { durationMs: number }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setCollapsed(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-surface-300/50">
      <div
        className="h-full bg-brand-500"
        style={{
          width: collapsed ? "0%" : "100%",
          transitionProperty: "width",
          transitionDuration: `${durationMs}ms`,
          transitionTimingFunction: "linear",
        }}
      />
    </div>
  );
}

export function UndoToastStack({
  pendingDeletes,
  onUndo,
}: {
  pendingDeletes: PendingDelete[];
  onUndo: (id: string) => void;
}) {
  if (pendingDeletes.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 z-50 flex w-80 -translate-x-1/2 flex-col gap-2">
      {pendingDeletes.map((p) => (
        <div
          key={p.id}
          className="overflow-hidden rounded-xl border border-surface-300 bg-surface-100 shadow-lg"
        >
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="text-sm text-surface-800">{p.message}</span>
            <button
              onClick={() => onUndo(p.id)}
              className="flex items-center gap-1.5 text-sm font-medium text-brand-400 hover:text-brand-300 transition-colors cursor-pointer"
            >
              <Undo2 className="h-3.5 w-3.5" />
              Undo
            </button>
          </div>
          <ToastBar durationMs={p.durationMs} />
        </div>
      ))}
    </div>
  );
}
