"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Upload,
  LayoutDashboard,
  Film,
  Settings,
  Sparkles,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Upload", icon: Upload },
  { href: "/library", label: "My Clips", icon: Film },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-64 flex-col border-r border-surface-200/50 bg-surface-50/50">
      <div className="flex items-center gap-2.5 px-6 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-brand">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <span className="text-lg font-bold gradient-brand-text">ClipInc</span>
      </div>

      <nav className="flex-1 px-3 py-2">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 mb-1",
                isActive
                  ? "bg-brand-600/15 text-brand-300"
                  : "text-surface-500 hover:text-surface-700 hover:bg-surface-200/50"
              )}
            >
              <item.icon className="h-4.5 w-4.5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-surface-200/50 p-3">
        <Link
          href="/settings"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-surface-500 hover:text-surface-700 hover:bg-surface-200/50 transition-all duration-200"
        >
          <Settings className="h-4.5 w-4.5" />
          Settings
        </Link>
      </div>
    </aside>
  );
}
