"use client";

import { useState, useMemo } from "react";
import { useProject } from "@/hooks/useProject";
import { useI18n } from "@/lib/i18n";
import { Expandable } from "@/components/Expandable";
import { useApi, apiPost, apiPatch, apiDelete } from "@/hooks/useApi";
import { useTranslate } from "@/hooks/useTranslate";
import { Card } from "@/components/Card";
import { TaskLine } from "@/components/TaskLine";
import { StatusBadge } from "@/components/StatusBadge";
import { Plus, X, Pencil, Trash2, Phone, Mail, Tag, Truck } from "lucide-react";
import { mutate } from "swr";

const input = "w-full rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--fg)] placeholder-[var(--fg-muted)]/60 outline-none transition-all focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/10";

export default function VendorsPage() {
  const { t, lang } = useI18n();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const { activeProject: project } = useProject();
  const { data: vendors } = useApi<any[]>(project ? `/api/vendors?projectId=${project.id}` : null);
  const { data: allNodes } = useApi<any[]>(project ? `/api/nodes?projectId=${project.id}` : null);

  const allTexts = useMemo(() => [
    ...(vendors?.map((v: any) => v.name) || []),
    ...(allNodes?.map((n: any) => n.name) || []),
  ], [vendors, allNodes]);
  const tr = useTranslate(allTexts);

  const fmt = (n: number) => new Intl.NumberFormat(lang === "he" ? "he-IL" : "en-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(n);

  const [form, setForm] = useState({ name: "", category: "", phone: "", email: "" });
  const resetForm = () => { setForm({ name: "", category: "", phone: "", email: "" }); setEditId(null); setShowForm(false); setError(""); };
  const startEdit = (v: any) => { setForm({ name: v.name, category: v.category || "", phone: v.phone || "", email: v.email || "" }); setEditId(v.id); setShowForm(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    try {
      if (editId) {
        await apiPatch(`/api/vendors/${editId}`, { name: form.name, category: form.category || null, phone: form.phone || null, email: form.email || null });
      } else {
        await apiPost("/api/vendors", { name: form.name, projectId: project.id, category: form.category || undefined, phone: form.phone || undefined, email: form.email || undefined });
      }
      resetForm(); mutate(`/api/vendors?projectId=${project.id}`);
    } catch (err: any) { setError(err.message); }
  };

  const handleDelete = async (v: any) => {
    if (!confirm(t("vendor.deleteConfirm").replace("{name}", v.name))) return;
    await apiDelete(`/api/vendors/${v.id}`); mutate(`/api/vendors?projectId=${project.id}`);
  };

  // Compute vendor financials
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
  const grandPaid = vendorStats.reduce((s, v) => s + v.totalPaid, 0);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--fg)]">{t("vendor.title")}</h1>
          <p className="mt-0.5 text-sm text-[var(--fg-muted)]">{vendors?.length ?? 0} {t("nav.vendors").toLowerCase()} · {fmt(grandTotal)} {t("costs.totalCost").toLowerCase()}</p>
        </div>
        <button onClick={() => { if (showForm) resetForm(); else setShowForm(true); }}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${showForm ? "bg-[var(--border-subtle)] text-[var(--fg-secondary)]" : "bg-[var(--fg)] text-[var(--bg-elevated)] shadow-lg shadow-[var(--fg)]/10"}`}>
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? t("task.cancel") : t("vendor.addVendor")}
        </button>
      </div>

      {showForm && (
        <Card glow>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input type="text" placeholder={t("vendor.name")} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className={input} />
            <input type="text" placeholder={t("vendor.category")} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={input} />
            <div className="grid grid-cols-2 gap-3">
              <input type="tel" placeholder={t("vendor.phone")} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={input} />
              <input type="email" placeholder={t("vendor.email")} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={input} />
            </div>
            {error && <p className="text-xs font-medium text-[var(--alert)]">{error}</p>}
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
              <Expandable trigger={
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)]">
                        <Truck size={16} className="text-[var(--accent)]" />
                      </div>
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
                      <div className="mt-2 ms-11.5">
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--border-subtle)]">
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(v.pct, 100)}%`, background: "linear-gradient(90deg, var(--success), #78B080)" }} />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 text-end">
                    {v.totalCost > 0 && (
                      <>
                        <p className="text-sm font-bold text-[var(--fg)]">{fmt(v.totalCost)}</p>
                        <p className="text-[11px] text-[var(--fg-muted)]">
                          <span className="text-[var(--success)]">{fmt(v.totalPaid)}</span> {t("costs.paidOf").toLowerCase()} {fmt(v.totalCost)}
                        </p>
                        {v.remaining > 0 && <p className="text-[10px] font-semibold text-[var(--alert)]">{fmt(v.remaining)} {t("task.left")}</p>}
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => startEdit(v)} className="rounded-lg bg-[var(--fg)]/5 p-1.5 text-[var(--fg)] hover:bg-[var(--accent)] hover:text-white"><Pencil size={13} /></button>
                    <button onClick={() => handleDelete(v)} className="rounded-lg bg-[var(--fg)]/5 p-1.5 text-[var(--fg)] hover:bg-[var(--alert)] hover:text-white"><Trash2 size={13} /></button>
                  </div>
                </div>
              }>
                {v.nodes.length > 0 ? (
                  <div className="space-y-0.5 rounded-lg bg-[var(--bg)] p-2">
                    {v.nodes.map((n: any) => <TaskLine key={n.id} node={n} tr={tr} compact />)}
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
