"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useProject } from "@/hooks/useProject";
import { apiPost } from "@/hooks/useApi";
import { Card } from "@/components/Card";
import { Plus, X, Check, FolderKanban } from "lucide-react";
import { useTranslate } from "@/hooks/useTranslate";
import { mutate } from "swr";

const input = "w-full rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--fg)] placeholder-[var(--fg-muted)]/60 outline-none transition-all focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/10";

export default function ProjectsPage() {
  const { t, lang } = useI18n();
  const { projects, activeProject, setActiveProjectId } = useProject();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", totalBudget: "", startDate: "", endDate: "" });
  const [error, setError] = useState("");

  const allTexts = projects.map((p: any) => p.name);
  const tr = useTranslate(allTexts);

  const fmt = (n: number) => new Intl.NumberFormat(lang === "he" ? "he-IL" : "en-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(n);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    try {
      const proj = await apiPost("/api/projects", {
        name: form.name,
        totalBudget: Number(form.totalBudget),
        expectedStartDate: form.startDate || undefined,
        expectedEndDate: form.endDate || undefined,
      });
      setForm({ name: "", totalBudget: "", startDate: "", endDate: "" });
      setShowForm(false);
      mutate("/api/projects");
      setActiveProjectId(proj.id);
    } catch (err: any) { setError(err.message); }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--fg)]">{t("proj.title")}</h1>
          <p className="mt-0.5 text-sm text-[var(--fg-muted)]">{projects.length} {t("nav.projects").toLowerCase()}</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${showForm ? "bg-[var(--border-subtle)] text-[var(--fg-secondary)]" : "bg-[var(--fg)] text-[var(--bg-elevated)] shadow-lg shadow-[var(--fg)]/10"}`}>
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? t("task.cancel") : t("proj.create")}
        </button>
      </div>

      {showForm && (
        <Card glow>
          <form onSubmit={handleCreate} className="space-y-3">
            <input type="text" placeholder={t("proj.name")} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className={input} />
            <div className="grid grid-cols-3 gap-3">
              <input type="number" placeholder={`${t("proj.budget")} (₪)`} value={form.totalBudget} onChange={(e) => setForm({ ...form, totalBudget: e.target.value })} required className={input} />
              <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className={input} placeholder={t("proj.startDate")} />
              <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className={input} placeholder={t("proj.endDate")} />
            </div>
            {error && <p className="text-xs font-medium text-[var(--alert)]">{error}</p>}
            <button type="submit" className="w-full rounded-xl bg-[var(--accent)] py-3 text-sm font-semibold text-white shadow-md shadow-[var(--accent)]/20">{t("task.save")}</button>
          </form>
        </Card>
      )}

      {projects.length === 0 ? (
        <Card><p className="py-12 text-center text-sm text-[var(--fg-muted)]">{t("proj.noProjects")}</p></Card>
      ) : (
        <div className="space-y-3">
          {projects.map((proj: any) => {
            const isActive = proj.id === activeProject?.id;
            return (
              <Card
                key={proj.id}
                onClick={() => setActiveProjectId(proj.id)}
                className={`cursor-pointer transition-all ${isActive ? "ring-2 ring-[var(--accent)]" : "hover:border-[var(--accent)]/20"}`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${isActive ? "bg-[var(--accent)] text-white" : "bg-[var(--fg)]/5 text-[var(--fg-muted)]"}`}>
                      <FolderKanban size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--fg)]">{tr(proj.name)}</p>
                      <div className="mt-0.5 flex items-center gap-3 text-xs text-[var(--fg-muted)]">
                        <span>{fmt(Number(proj.totalBudget))}</span>
                        {proj.expectedStartDate && proj.expectedEndDate && (
                          <span>
                            {new Date(proj.expectedStartDate).toLocaleDateString(lang === "he" ? "he-IL" : "en-IL", { month: "short", year: "numeric" })}
                            {" — "}
                            {new Date(proj.expectedEndDate).toLocaleDateString(lang === "he" ? "he-IL" : "en-IL", { month: "short", year: "numeric" })}
                          </span>
                        )}
                        <span>{proj.members?.length || 0} {t("nav.team").toLowerCase()}</span>
                      </div>
                    </div>
                  </div>
                  {isActive ? (
                    <span className="flex items-center gap-1 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-[11px] font-bold text-white">
                      <Check size={12} />{t("proj.active")}
                    </span>
                  ) : (
                    <span className="rounded-lg bg-[var(--fg)]/5 px-3 py-1.5 text-[11px] font-semibold text-[var(--fg-muted)]">
                      {t("proj.switch")}
                    </span>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
