"use client";

import { useClipContext } from "@/context/clip-context";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import type { SocialPlatform } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Check, Link as LinkIcon, Unlink } from "lucide-react";

const platformConfig: Record<
  SocialPlatform,
  { label: string; color: string; bgColor: string }
> = {
  tiktok:    { label: "TikTok",       color: "text-pink-400",   bgColor: "bg-pink-600/20"   },
  youtube:   { label: "YouTube",      color: "text-red-400",    bgColor: "bg-red-600/20"    },
  instagram: { label: "Instagram",    color: "text-purple-400", bgColor: "bg-purple-600/20" },
  twitter:   { label: "Twitter / X",  color: "text-sky-400",    bgColor: "bg-sky-600/20"    },
};

export default function SettingsPage() {
  const { socialAccounts, disconnectAccount } = useClipContext();

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 space-y-8">
      <div>
        <h1 className="text-2xl font-bold gradient-brand-text">Settings</h1>
        <p className="mt-1 text-sm text-surface-500">
          Manage your account and connected platforms
        </p>
      </div>

      <GlassCard className="space-y-4">
        <h3 className="text-sm font-medium text-surface-700">Connected Accounts</h3>
        <div className="space-y-2">
          {socialAccounts.map((account) => {
            const config = platformConfig[account.platform];
            return (
              <div
                key={account.platform}
                className="flex items-center justify-between rounded-xl p-4 glass"
              >
                <div className="flex items-center gap-3">
                  <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", config.bgColor)}>
                    <span className={cn("text-sm font-bold", config.color)}>
                      {config.label[0]}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-surface-700">{config.label}</p>
                    {account.connected ? (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                        <Check className="h-3 w-3" />
                        <span>{account.username ?? "Connected"}</span>
                      </div>
                    ) : (
                      <p className="text-xs text-surface-500">Not connected</p>
                    )}
                  </div>
                </div>

                {account.connected ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => disconnectAccount(account.platform)}
                  >
                    <Unlink className="h-3 w-3" />
                    Disconnect
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
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

      <GlassCard className="space-y-4">
        <h3 className="text-sm font-medium text-surface-700">Default Export Settings</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-surface-500">Default Aspect Ratio</label>
            <select className="mt-1 h-10 w-full rounded-xl border border-surface-300 bg-surface-100/50 px-3 text-sm text-surface-800 focus:border-brand-500 focus:outline-none">
              <option>9:16 (Vertical)</option>
              <option>1:1 (Square)</option>
              <option>16:9 (Landscape)</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-surface-500">Max Clip Duration</label>
            <select className="mt-1 h-10 w-full rounded-xl border border-surface-300 bg-surface-100/50 px-3 text-sm text-surface-800 focus:border-brand-500 focus:outline-none">
              <option>30 seconds</option>
              <option>60 seconds</option>
              <option>90 seconds</option>
            </select>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
