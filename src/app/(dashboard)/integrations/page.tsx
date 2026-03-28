"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useApi, apiPost, apiDelete } from "@/hooks/useApi";
import { Card } from "@/components/Card";
import {
  Plug,
  Key,
  Copy,
  Check,
  Trash2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Bot,
  Sparkles,
  MessageSquare,
} from "lucide-react";
import { mutate } from "swr";

const input =
  "w-full rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--fg)] placeholder-[var(--fg-muted)]/60 outline-none transition-all focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/10";

const PLATFORMS = [
  { id: "claude", name: "Claude", icon: Bot, color: "#b8956a", desc: "Anthropic — Easiest setup", tag: "Recommended" },
  { id: "chatgpt", name: "ChatGPT", icon: MessageSquare, color: "#10a37f", desc: "OpenAI — Requires Plus ($20/mo)", tag: "" },
  { id: "gemini", name: "Gemini CLI", icon: Sparkles, color: "#4285f4", desc: "Google — Requires terminal", tag: "" },
] as const;

type SetupData = {
  platform: string;
  requirement?: string;
  note?: string;
  steps: { step: number; title: string; description: string; copyable?: string }[];
  key: string;
  mcpUrl?: string;
};

export default function IntegrationsPage() {
  const { t, lang } = useI18n();
  const { data: keys, isLoading } = useApi<any[]>("/api/keys");
  const [setupData, setSetupData] = useState<SetupData | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyScope, setNewKeyScope] = useState("READ_WRITE");
  const [newKeyResult, setNewKeyResult] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSetup = async (platform: string) => {
    setLoading(platform);
    try {
      const data = await apiPost("/api/keys/setup", { platform });
      setSetupData(data as SetupData);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(null);
      mutate("/api/keys");
    }
  };

  const handleRevoke = async (id: string, name: string) => {
    if (!confirm(t("integ.revokeConfirm"))) return;
    await apiDelete(`/api/keys/${id}`);
    mutate("/api/keys");
  };

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) return;
    try {
      const data = await apiPost("/api/keys", { name: newKeyName, scope: newKeyScope });
      setNewKeyResult((data as any).key);
      setNewKeyName("");
      mutate("/api/keys");
    } catch (err: any) {
      alert(err.message);
    }
  };

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-[var(--fg)]">
          <Plug size={22} />
          {t("integ.title")}
        </h1>
        <p className="mt-1 text-sm text-[var(--fg-muted)]">{t("integ.subtitle")}</p>
      </div>

      {/* Platform Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {PLATFORMS.map(({ id, name, icon: Icon, color, desc, tag }) => (
          <Card key={id} glow>
            <div className="flex flex-col items-center gap-3 py-2 text-center">
              {tag && (
                <span className="rounded-full bg-[var(--success-soft)] px-2.5 py-0.5 text-[10px] font-bold text-[var(--success)]">
                  {tag}
                </span>
              )}
              <div className="rounded-xl p-3" style={{ backgroundColor: `${color}15` }}>
                <Icon size={28} style={{ color }} />
              </div>
              <div>
                <p className="text-sm font-bold text-[var(--fg)]">{name}</p>
                <p className="text-[11px] text-[var(--fg-muted)]">{desc}</p>
              </div>
              <button
                onClick={() => handleSetup(id)}
                disabled={loading === id}
                className="w-full rounded-xl bg-[var(--fg)] px-4 py-2.5 text-xs font-semibold text-[var(--bg-elevated)] shadow-md transition-all hover:shadow-lg disabled:opacity-50"
              >
                {loading === id ? "..." : t("integ.setup")}
              </button>
            </div>
          </Card>
        ))}
      </div>

      {/* Setup Wizard (shown after clicking Set Up) */}
      {setupData && (
        <Card glow>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-[var(--fg)]">
                {setupData.platform} — {t("integ.setup")}
              </p>
              <button
                onClick={() => setSetupData(null)}
                className="text-xs text-[var(--fg-muted)] hover:text-[var(--fg)]"
              >
                ✕
              </button>
            </div>

            {setupData.requirement && (
              <div className="rounded-xl bg-[var(--accent-soft)] p-2.5">
                <p className="text-xs text-[var(--fg-secondary)]">{setupData.requirement}</p>
              </div>
            )}

            {setupData.note && (
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-2.5">
                <p className="text-xs text-blue-800">{setupData.note}</p>
              </div>
            )}

            {/* API Key Warning */}
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs font-bold text-amber-800">{t("integ.keyWarning")}</p>
              <div className="mt-2 flex items-center gap-2">
                <code className="flex-1 break-all rounded-lg bg-white px-3 py-2 font-mono text-xs text-[var(--fg)]">
                  {setupData.key}
                </code>
                <button
                  onClick={() => copyText(setupData.key, "wizard-key")}
                  className="shrink-0 rounded-lg bg-amber-100 p-2 transition-all hover:bg-amber-200"
                >
                  {copied === "wizard-key" ? <Check size={14} className="text-[var(--success)]" /> : <Copy size={14} className="text-amber-700" />}
                </button>
              </div>
            </div>

            {/* Steps */}
            <div className="space-y-3">
              {setupData.steps.map((step) => (
                <div key={step.step} className="flex gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[10px] font-bold text-white">
                    {step.step}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[var(--fg)]">{step.title}</p>
                    <p className="text-xs text-[var(--fg-secondary)]">{step.description}</p>
                    {step.copyable && (
                      <div className="mt-1.5 flex items-start gap-2">
                        <code className="flex-1 break-all rounded-lg bg-[var(--bg)] px-3 py-2 font-mono text-[10px] text-[var(--fg-secondary)]">
                          {step.copyable.length > 200 ? step.copyable.slice(0, 200) + "..." : step.copyable}
                        </code>
                        <button
                          onClick={() => copyText(step.copyable!, `step-${step.step}`)}
                          className="shrink-0 rounded-lg p-1.5 text-[var(--fg-muted)] transition-all hover:bg-[var(--border-subtle)] hover:text-[var(--fg)]"
                        >
                          {copied === `step-${step.step}` ? (
                            <Check size={12} className="text-[var(--success)]" />
                          ) : (
                            <Copy size={12} />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Try it */}
            <div className="rounded-xl bg-[var(--warm-glow)] p-3">
              <p className="text-xs font-semibold text-[var(--accent)]">{t("integ.tryIt")}</p>
              <p className="mt-0.5 text-sm italic text-[var(--fg-secondary)]">"{t("integ.trySample")}"</p>
            </div>
          </div>
        </Card>
      )}

      {/* Active Connections */}
      <div>
        <h2 className="mb-3 text-base font-bold text-[var(--fg)]">{t("integ.connections")}</h2>
        {!keys?.length && !isLoading ? (
          <p className="text-sm text-[var(--fg-muted)]">{t("integ.noConnections")}</p>
        ) : (
          <div className="space-y-2">
            {keys?.map((key: any) => (
              <Card key={key.id}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-[var(--accent-soft)] p-2">
                      <Key size={14} className="text-[var(--accent)]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--fg)]">{key.name}</p>
                      <div className="flex items-center gap-2 text-[11px] text-[var(--fg-muted)]">
                        <code>{key.keyPrefix}</code>
                        <span>·</span>
                        <span className="rounded bg-[var(--border-subtle)] px-1.5 py-0.5 text-[10px] font-medium">
                          {key.scope === "READ_ONLY" ? t("integ.scopeReadOnly") : key.scope === "ADMIN" ? t("integ.scopeAdmin") : t("integ.scopeReadWrite")}
                        </span>
                        {key.project && (
                          <>
                            <span>·</span>
                            <span>{key.project.name}</span>
                          </>
                        )}
                      </div>
                      <p className="text-[10px] text-[var(--fg-muted)]">
                        {key.lastUsedAt
                          ? `${t("integ.lastUsed")} ${new Date(key.lastUsedAt).toLocaleDateString(lang === "he" ? "he-IL" : "en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`
                          : t("integ.neverUsed")}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRevoke(key.id, key.name)}
                    className="rounded-lg p-2 text-[var(--fg-muted)]/30 transition-all hover:bg-[var(--alert-soft)] hover:text-[var(--alert)]"
                    title={t("integ.revoke")}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Advanced */}
      <div>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm font-semibold text-[var(--fg-secondary)] transition-colors hover:text-[var(--fg)]"
        >
          {showAdvanced ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          {t("integ.advanced")}
        </button>

        {showAdvanced && (
          <div className="mt-3 space-y-4">
            {/* Create custom key */}
            <Card>
              <p className="mb-3 text-sm font-semibold text-[var(--fg)]">{t("integ.createKey")}</p>
              <div className="space-y-3">
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder={t("integ.keyName")}
                  className={input}
                />
                <div className="flex gap-3">
                  <select
                    value={newKeyScope}
                    onChange={(e) => setNewKeyScope(e.target.value)}
                    className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--fg)] outline-none focus:border-[var(--accent)]"
                  >
                    <option value="READ_ONLY">{t("integ.scopeReadOnly")}</option>
                    <option value="READ_WRITE">{t("integ.scopeReadWrite")}</option>
                    <option value="ADMIN">{t("integ.scopeAdmin")}</option>
                  </select>
                  <button
                    onClick={handleCreateKey}
                    className="rounded-xl bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-white shadow-md shadow-[var(--accent)]/20 transition-all hover:bg-[var(--accent-hover)] hover:shadow-lg"
                  >
                    {t("integ.createKey")}
                  </button>
                </div>

                {newKeyResult && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                    <p className="text-xs font-bold text-amber-800">{t("integ.keyWarning")}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <code className="flex-1 break-all rounded-lg bg-white px-3 py-2 font-mono text-xs text-[var(--fg)]">
                        {newKeyResult}
                      </code>
                      <button
                        onClick={() => copyText(newKeyResult, "new-key")}
                        className="shrink-0 rounded-lg bg-amber-100 p-2 transition-all hover:bg-amber-200"
                      >
                        {copied === "new-key" ? <Check size={14} className="text-[var(--success)]" /> : <Copy size={14} className="text-amber-700" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* URLs */}
            <Card>
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold text-[var(--fg-muted)]">{t("integ.openApiUrl")}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <code className="flex-1 break-all rounded-lg bg-[var(--bg)] px-3 py-2 text-xs text-[var(--fg-secondary)]">
                      {baseUrl}/api/openapi.json
                    </code>
                    <button
                      onClick={() => copyText(`${baseUrl}/api/openapi.json`, "openapi")}
                      className="shrink-0 rounded-lg p-1.5 text-[var(--fg-muted)] hover:bg-[var(--border-subtle)]"
                    >
                      {copied === "openapi" ? <Check size={12} className="text-[var(--success)]" /> : <Copy size={12} />}
                    </button>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-[var(--fg-muted)]">{t("integ.mcpUrl")}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <code className="flex-1 break-all rounded-lg bg-[var(--bg)] px-3 py-2 text-xs text-[var(--fg-secondary)]">
                      {baseUrl}/api/agent/mcp
                    </code>
                    <button
                      onClick={() => copyText(`${baseUrl}/api/agent/mcp`, "mcp")}
                      className="shrink-0 rounded-lg p-1.5 text-[var(--fg-muted)] hover:bg-[var(--border-subtle)]"
                    >
                      {copied === "mcp" ? <Check size={12} className="text-[var(--success)]" /> : <Copy size={12} />}
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
