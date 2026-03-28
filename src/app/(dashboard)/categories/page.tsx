"use client";

import { useState, useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { useProject } from "@/hooks/useProject";
import { Expandable } from "@/components/Expandable";
import { useApi, apiPost, apiPatch, apiDelete } from "@/hooks/useApi";
import { useTranslate } from "@/hooks/useTranslate";
import { Card } from "@/components/Card";
import { TaskLine } from "@/components/TaskLine";
import { Plus, X, Pencil, Trash2, Tag } from "lucide-react";
import { mutate } from "swr";

const input = "w-full rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--fg)] placeholder-[var(--fg-muted)]/60 outline-none transition-all focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/10";

export default function CategoriesPage() {
  const { t, lang } = useI18n();
  const { activeProject: project } = useProject();
  const { data: categories } = useApi<any[]>(project ? `/api/categories?projectId=${project.id}` : null);
  const { data: allNodes } = useApi<any[]>(project ? `/api/nodes?projectId=${project.id}` : null);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "" });
  const [error, setError] = useState("");

  const allTexts = useMemo(() => [
    ...(categories?.map((c: any) => c.name) || []),
    ...(allNodes?.map((n: any) => n.name) || []),
  ], [categories, allNodes]);
  const tr = useTranslate(allTexts);
  const fmt = (n: number) => new Intl.NumberFormat(lang === "he" ? "he-IL" : "en-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(n);

  const mutateCats = () => mutate(`/api/categories?projectId=${project?.id}`);
  const resetForm = () => { setForm({ name: "" }); setEditId(null); setShowForm(false); setError(""); };
  const startEdit = (c: any) => { setForm({ name: c.name }); setEditId(c.id); setShowForm(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    try {
      if (editId) {
        await apiPatch(`/api/categories/${editId}`, { name: form.name });
      } else {
        await apiPost("/api/categories", { name: form.name, projectId: project.id });
      }
      resetForm(); mutateCats();
    } catch (err: any) { setError(err.message); }
  };

  const handleDelete = async (c: any) => {
    if (!confirm(t("cat.deleteConfirm").replace("{name}", c.name))) return;
    await apiDelete(`/api/categories/${c.id}`); mutateCats();
  };

  const catStats = useMemo(() => {
    if (!categories || !allNodes) return [];
    return categories.map((cat: any) => {
      const nodes = allNodes.filter((n: any) => n.categoryId === cat.id);
      const totalCost = nodes.reduce((s: number, n: any) => s + (Number(n.expectedCost) || 0), 0);
      const totalPaid = nodes.reduce((s: number, n: any) => s + (Number(n._paid) || 0), 0);
      const remaining = totalCost - totalPaid;
      const pct = totalCost > 0 ? Math.round((totalPaid / totalCost) * 100) : 0;
      return { ...cat, nodes, totalCost, totalPaid, remaining, pct };
    });
  }, [categories, allNodes]);

  const grandTotal = catStats.reduce((s, c) => s + c.totalCost, 0);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--fg)]">{t("cat.title")}</h1>
          <p className="mt-0.5 text-sm text-[var(--fg-muted)]">{categories?.length ?? 0} {t("cat.title").toLowerCase()} · {fmt(grandTotal)} {t("costs.totalCost").toLowerCase()}</p>
        </div>
        <button onClick={() => { if (showForm) resetForm(); else setShowForm(true); }}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${showForm ? "bg-[var(--border-subtle)] text-[var(--fg-secondary)]" : "bg-[var(--fg)] text-[var(--bg-elevated)] shadow-lg shadow-[var(--fg)]/10"}`}>
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? t("task.cancel") : t("cat.addCategory")}
        </button>
      </div>

      {showForm && (
        <Card glow>
          <form onSubmit={handleSubmit} className="flex gap-3">
            <input type="text" placeholder={t("cat.name")} value={form.name} onChange={(e) => setForm({ name: e.target.value })} required className={`${input} flex-1`} />
            <button type="submit" className="shrink-0 rounded-xl bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-white">{t("task.save")}</button>
          </form>
          {error && <p className="mt-2 text-xs font-medium text-[var(--alert)]">{error}</p>}
        </Card>
      )}

      {!categories ? (
        <p className="py-16 text-center text-sm text-[var(--fg-muted)]">{t("general.loading")}</p>
      ) : categories.length === 0 ? (
        <Card><p className="py-12 text-center text-sm text-[var(--fg-muted)]">{t("cat.noCategories")}</p></Card>
      ) : (
        <div className="space-y-2">
          {catStats.map((cat) => (
            <Card key={cat.id}>
              <Expandable trigger={
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)]">
                        <Tag size={16} className="text-[var(--accent)]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[var(--fg)]">{tr(cat.name)}</p>
                        <p className="text-[11px] text-[var(--fg-muted)]">{cat.nodes.length} {t("dash.tasks").toLowerCase()}</p>
                      </div>
                    </div>
                    {cat.totalCost > 0 && (
                      <div className="mt-2 ms-11.5">
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--border-subtle)]">
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(cat.pct, 100)}%`, background: "linear-gradient(90deg, var(--success), #78B080)" }} />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 text-end">
                    {cat.totalCost > 0 && (
                      <>
                        <p className="text-sm font-bold text-[var(--fg)]">{fmt(cat.totalCost)}</p>
                        <p className="text-[11px] text-[var(--fg-muted)]">
                          <span className="text-[var(--success)]">{fmt(cat.totalPaid)}</span> {t("costs.paidOf").toLowerCase()} {fmt(cat.totalCost)}
                        </p>
                        {cat.remaining > 0 && <p className="text-[10px] font-semibold text-[var(--alert)]">{fmt(cat.remaining)} {t("task.left")}</p>}
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => startEdit(cat)} className="rounded-lg bg-[var(--fg)]/5 p-1.5 text-[var(--fg)] hover:bg-[var(--accent)] hover:text-white"><Pencil size={13} /></button>
                    <button onClick={() => handleDelete(cat)} className="rounded-lg bg-[var(--fg)]/5 p-1.5 text-[var(--fg)] hover:bg-[var(--alert)] hover:text-white"><Trash2 size={13} /></button>
                  </div>
                </div>
              }>
                {cat.nodes.length > 0 ? (
                  <div className="space-y-0.5 rounded-lg bg-[var(--bg)] p-2">
                    {cat.nodes.map((n: any) => <TaskLine key={n.id} node={n} tr={tr} compact />)}
                  </div>
                ) : <p className="text-xs text-[var(--fg-muted)] py-2">—</p>}
              </Expandable>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
