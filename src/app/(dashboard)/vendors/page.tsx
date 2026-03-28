"use client";

import { useState } from "react";
import { useProject } from "@/hooks/useProject";
import { useI18n } from "@/lib/i18n";
import { Expandable } from "@/components/Expandable";
import { useApi, apiPost, apiPatch, apiDelete } from "@/hooks/useApi";
import { useTranslate } from "@/hooks/useTranslate";
import { Card } from "@/components/Card";
import { Plus, X, Pencil, Trash2, Phone, Mail, Tag } from "lucide-react";
import { mutate } from "swr";

const input = "w-full rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--fg)] placeholder-[var(--fg-muted)]/60 outline-none transition-all focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/10";

export default function VendorsPage() {
  const { t } = useI18n();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const { activeProject: project } = useProject();
  const { data: vendors } = useApi<any[]>(project ? `/api/vendors?projectId=${project.id}` : null);
  const { data: allNodes } = useApi<any[]>(project ? `/api/nodes?projectId=${project.id}` : null);

  const allTexts = (vendors || []).map((v: any) => v.name);
  const tr = useTranslate(allTexts);

  const [form, setForm] = useState({ name: "", category: "", phone: "", email: "" });

  const resetForm = () => {
    setForm({ name: "", category: "", phone: "", email: "" });
    setEditId(null); setShowForm(false); setError("");
  };

  const startEdit = (v: any) => {
    setForm({ name: v.name, category: v.category || "", phone: v.phone || "", email: v.email || "" });
    setEditId(v.id); setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    try {
      if (editId) {
        await apiPatch(`/api/vendors/${editId}`, {
          name: form.name, category: form.category || null, phone: form.phone || null, email: form.email || null,
        });
      } else {
        await apiPost("/api/vendors", { name: form.name, projectId: project.id, category: form.category || undefined, phone: form.phone || undefined, email: form.email || undefined });
      }
      resetForm(); mutate(`/api/vendors?projectId=${project.id}`);
    } catch (err: any) { setError(err.message); }
  };

  const handleDelete = async (v: any) => {
    if (!confirm(t("vendor.deleteConfirm").replace("{name}", v.name))) return;
    await apiDelete(`/api/vendors/${v.id}`);
    mutate(`/api/vendors?projectId=${project.id}`);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--fg)]">{t("vendor.title")}</h1>
          <p className="mt-0.5 text-sm text-[var(--fg-muted)]">{vendors?.length ?? 0} {t("nav.vendors").toLowerCase()}</p>
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
            <button type="submit" className="w-full rounded-xl bg-[var(--accent)] py-3 text-sm font-semibold text-white shadow-md shadow-[var(--accent)]/20 transition-all hover:bg-[var(--accent-hover)]">
              {editId ? t("crud.edit") : t("task.save")}
            </button>
          </form>
        </Card>
      )}

      {!vendors ? (
        <p className="py-16 text-center text-sm text-[var(--fg-muted)]">{t("general.loading")}</p>
      ) : vendors.length === 0 ? (
        <Card><p className="py-12 text-center text-sm text-[var(--fg-muted)]">{t("vendor.noVendors")}</p></Card>
      ) : (
        <div className="space-y-2">
          {vendors.map((v: any) => {
            const vendorNodes = (allNodes || []).filter((n: any) => n.vendorId === v.id);
            return (
            <Card key={v.id}>
              <Expandable trigger={
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[var(--fg)]">{tr(v.name)}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--fg-muted)]">
                      {v.category && <span className="flex items-center gap-1"><Tag size={11} />{v.category}</span>}
                      {v.phone && <span className="flex items-center gap-1"><Phone size={11} />{v.phone}</span>}
                      {v.email && <span className="flex items-center gap-1"><Mail size={11} />{v.email}</span>}
                      {v._count?.nodes > 0 && <span>{v._count.nodes} {t("dash.tasks").toLowerCase()}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => startEdit(v)} className="rounded-lg bg-[var(--fg)]/5 p-1.5 text-[var(--fg)] hover:bg-[var(--accent)] hover:text-white" title={t("crud.edit")}>
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => handleDelete(v)} className="rounded-lg bg-[var(--fg)]/5 p-1.5 text-[var(--fg)] hover:bg-[var(--alert)] hover:text-white" title={t("crud.delete")}>
                      <Trash2 size={14} />
                  </button>
                </div>
              </div>
              }>
                {vendorNodes.length > 0 ? (
                  <div className="space-y-1 rounded-lg bg-[var(--bg)] p-2">
                    {vendorNodes.map((n: any) => (
                      <div key={n.id} className="flex items-center justify-between text-xs">
                        <span className="text-[var(--fg)]">{tr(n.name)}</span>
                        {n.expectedCost && <span className="font-semibold text-[var(--fg-muted)]">{new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(Number(n.expectedCost))}</span>}
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
