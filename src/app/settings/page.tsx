"use client";

import { useEffect, useState } from "react";
import { useClipContext } from "@/context/clip-context";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import type { SocialPlatform } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Check, Link as LinkIcon, Unlink, Cpu, Cloud, Eye, EyeOff } from "lucide-react";

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

  // ── Model provider state ───────────────────────────────────────────────────
  const [provider, setProvider] = useState<"local" | "claude">("local");
  const [claudeKey, setClaudeKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        setProvider(d.model_provider ?? "local");
        setClaudeKey(d.claude_api_key ?? "");
      })
      .catch(() => {});
  }, []);

  const saveModelSettings = async () => {
    setSaving(true);
    setSaved(false);
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model_provider: provider, claude_api_key: claudeKey }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 space-y-8">
      <div>
        <h1 className="text-2xl font-bold gradient-brand-text">Settings</h1>
        <p className="mt-1 text-sm text-surface-500">
          Manage your account and connected platforms
        </p>
      </div>

      {/* ── Model Provider ───────────────────────────────────────────────── */}
      <GlassCard className="space-y-4">
        <h3 className="text-sm font-medium text-surface-700">AI Model</h3>
        <p className="text-xs text-surface-500">
          Choose the model used to detect highlights from your transcripts.
        </p>

        <div className="grid grid-cols-2 gap-3">
          {/* Local */}
          <button
            onClick={() => setProvider("local")}
            className={cn(
              "flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all cursor-pointer",
              provider === "local"
                ? "border-brand-500 bg-brand-500/10 glow"
                : "border-surface-300 glass glass-hover"
            )}
          >
            <div className="flex items-center gap-2">
              <Cpu className={cn("h-4 w-4", provider === "local" ? "text-brand-400" : "text-surface-500")} />
              <span className={cn("text-sm font-medium", provider === "local" ? "text-brand-400" : "text-surface-700")}>
                Local Model
              </span>
            </div>
            <p className="text-xs text-surface-500">
              Uses your oMLX server. Free, private, runs on your machine.
            </p>
          </button>

          {/* Claude */}
          <button
            onClick={() => setProvider("claude")}
            className={cn(
              "flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all cursor-pointer",
              provider === "claude"
                ? "border-brand-500 bg-brand-500/10 glow"
                : "border-surface-300 glass glass-hover"
            )}
          >
            <div className="flex items-center gap-2">
              <Cloud className={cn("h-4 w-4", provider === "claude" ? "text-brand-400" : "text-surface-500")} />
              <span className={cn("text-sm font-medium", provider === "claude" ? "text-brand-400" : "text-surface-700")}>
                Claude
              </span>
            </div>
            <p className="text-xs text-surface-500">
              Anthropic's Claude. Better accuracy, requires API key.
            </p>
          </button>
        </div>

        {provider === "claude" && (
          <div className="space-y-2">
            <label className="text-xs text-surface-500">Anthropic API Key</label>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={claudeKey}
                onChange={(e) => setClaudeKey(e.target.value)}
                placeholder="sk-ant-..."
                className="w-full rounded-xl border border-surface-300 bg-surface-100/50 px-3 py-2 pr-10 text-sm text-surface-800 focus:border-brand-500 focus:outline-none font-mono"
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600 cursor-pointer"
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-surface-500">
              Get your key at{" "}
              <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer"
                className="text-brand-400 hover:underline">
                console.anthropic.com
              </a>
            </p>
          </div>
        )}

        <Button
          size="sm"
          onClick={saveModelSettings}
          disabled={saving}
          className="w-full"
        >
          {saved ? <><Check className="h-3.5 w-3.5" />Saved!</> : saving ? "Saving…" : "Save"}
        </Button>
      </GlassCard>

      {/* ── Connected Accounts ───────────────────────────────────────────── */}
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

      {/* ── Default Export Settings ──────────────────────────────────────── */}
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
