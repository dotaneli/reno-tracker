"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useProject } from "@/hooks/useProject";
import { Expandable } from "@/components/Expandable";
import { useApi, apiPost, apiPatch, apiDelete } from "@/hooks/useApi";
import { useTranslate } from "@/hooks/useTranslate";
import { Card } from "@/components/Card";
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

  const allTexts = (categories || []).map((c: any) => c.name);
  const tr = useTranslate(allTexts);

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
    await apiDelete(`/api/categories/${c.id}`);
    mutateCats();
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--fg)]">{t("cat.title")}</h1>
          <p className="mt-0.5 text-sm text-[var(--fg-muted)]">{categories?.length ?? 0} {t("cat.title").toLowerCase()}</p>
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
            <button type="submit" className="shrink-0 rounded-xl bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-white">{editId ? t("crud.edit") : t("task.save")}</button>
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
          {categories.map((cat: any) => {
            const catNodes = (allNodes || []).filter((n: any) => n.categoryId === cat.id);
            return (
              <Card key={cat.id}>
                <Expandable trigger={
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
                        <Tag size={16} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[var(--fg)]">{tr(cat.name)}</p>
                        <p className="text-xs text-[var(--fg-muted)]">{cat._count?.nodes || 0} {t("dash.tasks").toLowerCase()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => startEdit(cat)} className="rounded-lg bg-[var(--fg)]/5 p-1.5 text-[var(--fg)] hover:bg-[var(--accent)] hover:text-white"><Pencil size={13} /></button>
                      <button onClick={() => handleDelete(cat)} className="rounded-lg bg-[var(--fg)]/5 p-1.5 text-[var(--fg)] hover:bg-[var(--alert)] hover:text-white"><Trash2 size={13} /></button>
                    </div>
                  </div>
                }>
                  {catNodes.length > 0 ? (
                    <div className="space-y-1 rounded-lg bg-[var(--bg)] p-2">
                      {catNodes.map((n: any) => (
                        <div key={n.id} className="flex items-center justify-between text-xs">
                          <span className="text-[var(--fg)]">{tr(n.name)}</span>
                          {n.expectedCost && <span className="font-semibold text-[var(--fg-muted)]">{new Intl.NumberFormat(lang === "he" ? "he-IL" : "en-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(Number(n.expectedCost))}</span>}
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-xs text-[var(--fg-muted)] py-2">—</p>}
                </Expandable>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
