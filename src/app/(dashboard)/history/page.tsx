"use client";

import { useState } from "react";
import { useProject } from "@/hooks/useProject";
import { useI18n } from "@/lib/i18n";
import { useApi, apiPost, apiDelete } from "@/hooks/useApi";
import { Card } from "@/components/Card";
import { Save, RotateCcw, Trash2, Clock, Shield, User } from "lucide-react";
import { mutate } from "swr";

const input = "w-full rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--fg)] placeholder-[var(--fg-muted)]/60 outline-none transition-all focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/10";

export default function HistoryPage() {
  const { t, lang } = useI18n();
  const [showForm, setShowForm] = useState(false);
  const [label, setLabel] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [rolling, setRolling] = useState<string | null>(null);

  const { activeProject: project } = useProject();
  const { data: me } = useApi<any>("/api/me");
  const { data: snapshots } = useApi<any[]>(
    project ? `/api/projects/${project.id}/snapshots` : null
  );

  const isOwner = project?.members?.some(
    (m: any) => m.user?.id === me?.id && m.role === "OWNER"
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess("");
    try {
      await apiPost(`/api/projects/${project.id}/snapshots`, { label });
      setLabel(""); setShowForm(false);
      setSuccess(t("hist.checkpoint") + " ✓");
      mutate(`/api/projects/${project.id}/snapshots`);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRollback = async (snapshot: any) => {
    const msg = t("hist.rollbackConfirm").replace("{label}", snapshot.label);
    if (!confirm(msg)) return;

    setRolling(snapshot.id);
    try {
      const res = await fetch(`/api/projects/${project.id}/snapshots/${snapshot.id}`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      setSuccess(`${t("hist.restoredTo")} "${snapshot.label}"`);
      // Refresh everything
      mutate(`/api/projects/${project.id}/snapshots`);
      mutate(`/api/nodes?projectId=${project.id}`);
      mutate(`/api/vendors?projectId=${project.id}`);
      mutate(`/api/floors?projectId=${project.id}`);
      mutate("/api/issues");
      mutate("/api/projects");
      setTimeout(() => setSuccess(""), 5000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRolling(null);
    }
  };

  const handleDelete = async (snapshot: any) => {
    if (!confirm(t("crud.deleteConfirm").replace("{name}", snapshot.label))) return;
    await apiDelete(`/api/projects/${project.id}/snapshots/${snapshot.id}`);
    mutate(`/api/projects/${project.id}/snapshots`);
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString(lang === "he" ? "he-IL" : "en-IL", {
      day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--fg)]">{t("hist.title")}</h1>
          <p className="mt-0.5 text-sm text-[var(--fg-muted)]">{snapshots?.length ?? 0} {t("nav.history").toLowerCase()}</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-[var(--accent)]/20 transition-all hover:bg-[var(--accent-hover)] hover:shadow-lg"
        >
          <Save size={16} />
          {t("hist.checkpoint")}
        </button>
      </div>

      {/* Success/error banners */}
      {success && (
        <div className="rounded-xl bg-[var(--success-soft)] px-4 py-3 text-sm font-medium text-[var(--success)]">
          {success}
        </div>
      )}
      {error && (
        <div className="rounded-xl bg-[var(--alert-soft)] px-4 py-3 text-sm font-medium text-[var(--alert)]">
          {error}
        </div>
      )}

      {/* Save form */}
      {showForm && (
        <Card glow>
          <form onSubmit={handleSave} className="space-y-3">
            <div>
              <p className="mb-1 text-xs font-semibold text-[var(--fg-muted)]">{t("hist.label")}</p>
              <input
                type="text"
                placeholder={t("hist.labelPlaceholder")}
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                required
                className={input}
              />
            </div>
            <div className="flex gap-3">
              <button type="submit" className="flex-1 rounded-xl bg-[var(--accent)] py-3 text-sm font-semibold text-white">
                {t("task.save")}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="rounded-xl bg-[var(--border-subtle)] px-6 py-3 text-sm text-[var(--fg-secondary)]">
                {t("task.cancel")}
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* Version timeline */}
      {!snapshots ? (
        <p className="py-16 text-center text-sm text-[var(--fg-muted)]">{t("general.loading")}</p>
      ) : snapshots.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="rounded-full bg-[var(--accent-soft)] p-3">
              <Shield size={24} className="text-[var(--accent)]" />
            </div>
            <p className="text-sm text-[var(--fg-muted)]">{t("hist.noVersions")}</p>
          </div>
        </Card>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute start-5 top-0 bottom-0 w-px bg-[var(--border)]" />

          <div className="space-y-4">
            {snapshots.map((snap: any, i: number) => {
              const isAuto = snap.label.startsWith("Auto-save");
              const isLatest = i === 0;

              return (
                <div key={snap.id} className="relative flex gap-4 ps-12">
                  {/* Timeline dot */}
                  <div className={`absolute start-3 top-5 h-4 w-4 rounded-full border-2 ${
                    isLatest ? "border-[var(--accent)] bg-[var(--accent)]" : isAuto ? "border-[var(--fg-muted)] bg-[var(--bg)]" : "border-[var(--accent)] bg-[var(--bg)]"
                  }`} />

                  <Card className={`flex-1 ${rolling === snap.id ? "animate-pulse opacity-60" : ""}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm font-semibold ${isAuto ? "text-[var(--fg-muted)]" : "text-[var(--fg)]"}`}>
                            {snap.label}
                          </p>
                          {isLatest && (
                            <span className="rounded-lg bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--accent)]">
                              {t("hist.current")}
                            </span>
                          )}
                          {isAuto && (
                            <span className="rounded-lg bg-[var(--fg-muted)]/8 px-2 py-0.5 text-[10px] font-bold text-[var(--fg-muted)]">
                              {t("hist.autoSave")}
                            </span>
                          )}
                        </div>
                        <div className="mt-1.5 flex items-center gap-3 text-xs text-[var(--fg-muted)]">
                          <span className="flex items-center gap-1">
                            <Clock size={11} />
                            {formatDate(snap.createdAt)}
                          </span>
                          <span className="flex items-center gap-1">
                            <User size={11} />
                            {snap.author?.name || t("hist.savedBy")}
                          </span>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-1.5">
                        {isOwner && (
                          <button
                            onClick={() => handleRollback(snap)}
                            disabled={rolling !== null}
                            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-[var(--accent)] transition-all hover:bg-[var(--accent-soft)]"
                            title={t("hist.rollback")}
                          >
                            <RotateCcw size={13} />
                            {t("hist.rollback")}
                          </button>
                        )}
                        {isOwner && (
                          <button
                            onClick={() => handleDelete(snap)}
                            className="rounded-lg p-2 text-[var(--fg-muted)]/30 transition-all hover:bg-[var(--alert-soft)] hover:text-[var(--alert)]"
                            title={t("crud.delete")}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
