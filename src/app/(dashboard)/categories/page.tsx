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
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [addName, setAddName] = useState("");
  const [editName, setEditName] = useState("");
  const [error, setError] = useState("");

  const allTexts = useMemo(() => [...(categories?.map((c: any) => c.name) || []), ...(allNodes?.map((n: any) => n.name) || [])], [categories, allNodes]);
  const tr = useTranslate(allTexts);
  const fmt = (n: number) => new Intl.NumberFormat(lang === "he" ? "he-IL" : "en-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(n);
  const mutateCats = () => mutate(`/api/categories?projectId=${project?.id}`);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); if (!project) return;
    try { await apiPost("/api/categories", { name: addName, projectId: project.id }); setAddName(""); setShowAdd(false); mutateCats(); } catch (err: any) { setError(err.message); }
  };

  const startEdit = (c: any) => { setEditName(c.name); setEditId(c.id); setShowAdd(false); setError(""); };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    try { await apiPatch(`/api/categories/${editId}`, { name: editName }); setEditId(null); mutateCats(); } catch (err: any) { setError(err.message); }
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
        <button onClick={() => { setShowAdd(!showAdd); setEditId(null); }}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${showAdd ? "bg-[var(--border-subtle)] text-[var(--fg-secondary)]" : "bg-[var(--fg)] text-[var(--bg-elevated)] shadow-lg shadow-[var(--fg)]/10"}`}>
          {showAdd ? <X size={16} /> : <Plus size={16} />}
          {showAdd ? t("task.cancel") : t("cat.addCategory")}
        </button>
      </div>

      {showAdd && (
        <Card glow>
          <form onSubmit={handleAdd} className="flex gap-3">
            <input type="text" placeholder={t("cat.name")} value={addName} onChange={(e) => setAddName(e.target.value)} required className={`${input} flex-1`} autoFocus />
            <button type="submit" className="shrink-0 rounded-xl bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-white">{t("task.save")}</button>
          </form>
          {error && !editId && <p className="mt-2 text-xs font-medium text-[var(--alert)]">{error}</p>}
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
              {editId === cat.id ? (
                /* ── Inline edit ── */
                <form onSubmit={handleEdit} className="space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Tag size={14} className="text-[var(--accent)]" />
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent)]">{t("crud.edit")}</p>
                  </div>
                  <div className="flex gap-3">
                    <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} required className={`${input} flex-1`} autoFocus />
                    <button type="submit" className="shrink-0 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white">{t("task.save")}</button>
                    <button type="button" onClick={() => setEditId(null)} className="shrink-0 rounded-xl bg-[var(--border-subtle)] px-4 py-2.5 text-sm text-[var(--fg-secondary)]">{t("task.cancel")}</button>
                  </div>
                  {error && editId === cat.id && <p className="text-xs font-medium text-[var(--alert)]">{error}</p>}
                </form>
              ) : (
                /* ── Normal display ── */
                <Expandable trigger={
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)]"><Tag size={16} className="text-[var(--accent)]" /></div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-[var(--fg)]">{tr(cat.name)}</p>
                          <p className="text-[11px] text-[var(--fg-muted)]">{cat.nodes.length} {t("dash.tasks").toLowerCase()}</p>
                        </div>
                      </div>
                      {cat.totalCost > 0 && (
                        <div className="mt-2 ms-11.5"><div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--border-subtle)]"><div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(cat.pct, 100)}%`, background: "linear-gradient(90deg, var(--success), #78B080)" }} /></div></div>
                      )}
                    </div>
                    <div className="shrink-0 text-end">
                      {cat.totalCost > 0 && (
                        <>
                          <p className="text-sm font-bold text-[var(--fg)]">{fmt(cat.totalCost)}</p>
                          <p className="text-[11px] text-[var(--fg-muted)]"><span className="text-[var(--success)]">{fmt(cat.totalPaid)}</span> {t("costs.paidOf").toLowerCase()} {fmt(cat.totalCost)}</p>
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
                    <div className="space-y-0.5 rounded-lg bg-[var(--bg)] p-2">{cat.nodes.map((n: any) => <TaskLine key={n.id} node={n} tr={tr} compact />)}</div>
                  ) : <p className="text-xs text-[var(--fg-muted)] py-2">—</p>}
                </Expandable>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
