"use client";

import { useState, useMemo } from "react";
import { useProject } from "@/hooks/useProject";
import { useI18n } from "@/lib/i18n";
import { Expandable } from "@/components/Expandable";
import { useApi, apiPost, apiPatch, apiDelete } from "@/hooks/useApi";
import { useTranslate } from "@/hooks/useTranslate";
import { Card } from "@/components/Card";
import { TaskLine } from "@/components/TaskLine";
import { Plus, X, Pencil, Trash2, Phone, Mail, Tag, Truck } from "lucide-react";
import { mutate } from "swr";

const input = "w-full rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--fg)] placeholder-[var(--fg-muted)]/60 outline-none transition-all focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/10";

export default function VendorsPage() {
  const { t, lang } = useI18n();
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [addForm, setAddForm] = useState({ name: "", category: "", phone: "", email: "" });
  const [editForm, setEditForm] = useState({ name: "", category: "", phone: "", email: "" });

  const { activeProject: project } = useProject();
  const { data: vendors } = useApi<any[]>(project ? `/api/vendors?projectId=${project.id}` : null);
  const { data: allNodes } = useApi<any[]>(project ? `/api/nodes?projectId=${project.id}` : null);

  const allTexts = useMemo(() => [...(vendors?.map((v: any) => v.name) || []), ...(allNodes?.map((n: any) => n.name) || [])], [vendors, allNodes]);
  const tr = useTranslate(allTexts);
  const fmt = (n: number) => new Intl.NumberFormat(lang === "he" ? "he-IL" : "en-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(n);
  const mutateVendors = () => mutate(`/api/vendors?projectId=${project?.id}`);
  const mutateAll = () => { mutateVendors(); mutate(`/api/nodes?projectId=${project?.id}`); mutate(`/api/projects/${project?.id}/milestones`); mutate(`/api/projects`); };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); if (!project) return;
    try {
      await apiPost("/api/vendors", { name: addForm.name, projectId: project.id, category: addForm.category || undefined, phone: addForm.phone || undefined, email: addForm.email || undefined });
      setAddForm({ name: "", category: "", phone: "", email: "" }); setShowAdd(false); mutateVendors();
    } catch (err: any) { setError(err.message); }
  };

  const startEdit = (v: any) => {
    setEditForm({ name: v.name, category: v.category || "", phone: v.phone || "", email: v.email || "" });
    setEditId(v.id); setShowAdd(false); setError("");
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    try {
      await apiPatch(`/api/vendors/${editId}`, { name: editForm.name, category: editForm.category || null, phone: editForm.phone || null, email: editForm.email || null });
      setEditId(null); mutateVendors();
    } catch (err: any) { setError(err.message); }
  };

  const handleDelete = async (v: any) => {
    if (!confirm(t("vendor.deleteConfirm").replace("{name}", v.name))) return;
    await apiDelete(`/api/vendors/${v.id}`); mutateVendors();
  };

  const vendorStats = useMemo(() => {
    if (!vendors || !allNodes) return [];
    return vendors.map((v: any) => {
      const nodes = allNodes.filter((n: any) => n.vendorId === v.id);
      const totalCost = nodes.reduce((s: number, n: any) => s + (Number(n.expectedCost) || 0), 0);
      const totalPaid = nodes.reduce((s: number, n: any) => s + (Number(n._paid) || 0), 0);
      const remaining = totalCost - totalPaid;
      const pct = totalCost > 0 ? Math.round((totalPaid / totalCost) * 100) : 0;
      return { ...v, nodes, totalCost, totalPaid, remaining, pct };
    });
  }, [vendors, allNodes]);

  const grandTotal = vendorStats.reduce((s, v) => s + v.totalCost, 0);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--fg)]">{t("vendor.title")}</h1>
          <p className="mt-0.5 text-sm text-[var(--fg-muted)]">{vendors?.length ?? 0} {t("nav.vendors").toLowerCase()} · {fmt(grandTotal)} {t("costs.totalCost").toLowerCase()}</p>
        </div>
        <button onClick={() => { setShowAdd(!showAdd); setEditId(null); }}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${showAdd ? "bg-[var(--border-subtle)] text-[var(--fg-secondary)]" : "bg-[var(--fg)] text-[var(--bg-elevated)] shadow-lg shadow-[var(--fg)]/10"}`}>
          {showAdd ? <X size={16} /> : <Plus size={16} />}
          {showAdd ? t("task.cancel") : t("vendor.addVendor")}
        </button>
      </div>

      {/* Add new — stays at top (creation action) */}
      {showAdd && (
        <Card glow>
          <form onSubmit={handleAdd} className="space-y-3">
            <input type="text" placeholder={t("vendor.name")} value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} required className={input} />
            <input type="text" placeholder={t("vendor.category")} value={addForm.category} onChange={(e) => setAddForm({ ...addForm, category: e.target.value })} className={input} />
            <div className="grid grid-cols-2 gap-3">
              <input type="tel" placeholder={t("vendor.phone")} value={addForm.phone} onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })} className={input} />
              <input type="email" placeholder={t("vendor.email")} value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} className={input} />
            </div>
            {error && !editId && <p className="text-xs font-medium text-[var(--alert)]">{error}</p>}
            <button type="submit" className="w-full rounded-xl bg-[var(--accent)] py-3 text-sm font-semibold text-white shadow-md shadow-[var(--accent)]/20">{t("task.save")}</button>
          </form>
        </Card>
      )}

      {!vendors ? (
        <p className="py-16 text-center text-sm text-[var(--fg-muted)]">{t("general.loading")}</p>
      ) : vendors.length === 0 ? (
        <Card><p className="py-12 text-center text-sm text-[var(--fg-muted)]">{t("vendor.noVendors")}</p></Card>
      ) : (
        <div className="space-y-2">
          {vendorStats.map((v) => (
            <Card key={v.id}>
              {editId === v.id ? (
                /* ── Inline edit form ── */
                <form onSubmit={handleEdit} className="space-y-3">
                  <button type="button" onClick={() => setEditId(null)} className="flex w-full items-center justify-between rounded-lg px-1 py-1 -mx-1 transition-colors hover:bg-[var(--border-subtle)]">
                    <div className="flex items-center gap-2">
                      <Truck size={14} className="text-[var(--accent)]" />
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent)]">{t("crud.edit")}</p>
                    </div>
                    <X size={14} className="text-[var(--fg-muted)]" />
                  </button>
                  <input type="text" placeholder={t("vendor.name")} value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required className={input} autoFocus />
                  <input type="text" placeholder={t("vendor.category")} value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })} className={input} />
                  <div className="grid grid-cols-2 gap-3">
                    <input type="tel" placeholder={t("vendor.phone")} value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className={input} />
                    <input type="email" placeholder={t("vendor.email")} value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className={input} />
                  </div>
                  {error && editId === v.id && <p className="text-xs font-medium text-[var(--alert)]">{error}</p>}
                  <div className="flex gap-2">
                    <button type="submit" className="flex-1 rounded-xl bg-[var(--accent)] py-2.5 text-sm font-semibold text-white">{t("task.save")}</button>
                    <button type="button" onClick={() => setEditId(null)} className="rounded-xl bg-[var(--border-subtle)] px-5 py-2.5 text-sm text-[var(--fg-secondary)]">{t("task.cancel")}</button>
                  </div>
                </form>
              ) : (
                /* ── Normal display ── */
                <Expandable trigger={
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)]"><Truck size={16} className="text-[var(--accent)]" /></div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-[var(--fg)]">{tr(v.name)}</p>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-[var(--fg-muted)]">
                            {v.category && <span className="flex items-center gap-1"><Tag size={10} />{v.category}</span>}
                            {v.phone && <span className="flex items-center gap-1"><Phone size={10} />{v.phone}</span>}
                            {v.email && <span className="flex items-center gap-1"><Mail size={10} />{v.email}</span>}
                            <span>{v.nodes.length} {t("dash.tasks").toLowerCase()}</span>
                          </div>
                        </div>
                      </div>
                      {v.totalCost > 0 && (
                        <div className="mt-2 ms-11.5"><div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--border-subtle)]"><div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(v.pct, 100)}%`, background: "linear-gradient(90deg, var(--success), #78B080)" }} /></div></div>
                      )}
                    </div>
                    <div className="shrink-0 text-end">
                      {v.totalCost > 0 && (
                        <>
                          <p className="text-sm font-bold text-[var(--fg)]">{fmt(v.totalCost)}</p>
                          <p className="text-[11px] text-[var(--fg-muted)]"><span className="text-[var(--success)]">{fmt(v.totalPaid)}</span> {t("costs.paidOf").toLowerCase()} {fmt(v.totalCost)}</p>
                          {v.remaining > 0 && <p className="text-[10px] font-semibold text-[var(--alert)]">{fmt(v.remaining)} {t("task.left")}</p>}
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => editId === v.id ? setEditId(null) : startEdit(v)} className={`rounded-lg p-1.5 transition-all ${editId === v.id ? "bg-[var(--accent)] text-white hover:bg-[var(--alert)]" : "bg-[var(--fg)]/5 text-[var(--fg)] hover:bg-[var(--accent)] hover:text-white"}`}>
                        {editId === v.id ? <X size={13} /> : <Pencil size={13} />}
                      </button>
                      <button onClick={() => handleDelete(v)} className="rounded-lg bg-[var(--fg)]/5 p-1.5 text-[var(--fg)] hover:bg-[var(--alert)] hover:text-white"><Trash2 size={13} /></button>
                    </div>
                  </div>
                }>
                  {v.nodes.length > 0 ? (
                    <div className="space-y-0.5 rounded-lg bg-[var(--bg)] p-2">{v.nodes.map((n: any) => <TaskLine key={n.id} node={n} tr={tr} compact onMutate={mutateAll} />)}</div>
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
