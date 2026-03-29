"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useApi } from "@/hooks/useApi";
import { StatusBadge } from "./StatusBadge";
import { Plus, Upload, CheckCircle2, Trash2, FileText, Pencil, X } from "lucide-react";
import { mutate } from "swr";

const input = "w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--fg)] placeholder-[var(--fg-muted)]/60 outline-none focus:border-[var(--accent)]";

interface Props {
  itemId: string;
  expectedCost: number | null;
  onMutate?: () => void;
}

export function ItemMilestones({ itemId, expectedCost, onMutate: onParentMutate }: Props) {
  const { t, lang } = useI18n();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<"amount" | "pct">("amount");
  const [addForm, setAddForm] = useState({ label: "", amount: "", percentage: "", dueDate: "" });
  const [editForm, setEditForm] = useState({ label: "", amount: "", dueDate: "", status: "PENDING" });
  const [file, setFile] = useState<File | null>(null);
  const [editFile, setEditFile] = useState<File | null>(null);

  const { data: milestones } = useApi<any[]>(`/api/nodes/${itemId}/milestones`, { keepPreviousData: true });
  const mutateMilestones = () => { mutate(`/api/nodes/${itemId}/milestones`); onParentMutate?.(); };

  const fmt = (n: number) =>
    new Intl.NumberFormat(lang === "he" ? "he-IL" : "en-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(n);

  const totalPaid = milestones?.filter((m: any) => m.status === "PAID").reduce((s: number, m: any) => s + Number(m.amount), 0) || 0;
  const totalDue = milestones?.reduce((s: number, m: any) => s + Number(m.amount), 0) || 0;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append("label", addForm.label);
    if (inputMode === "pct") fd.append("percentage", addForm.percentage);
    else fd.append("amount", addForm.amount);
    if (addForm.dueDate) fd.append("dueDate", addForm.dueDate);
    if (file) fd.append("receipt", file);
    await fetch(`/api/nodes/${itemId}/milestones`, { method: "POST", body: fd });
    setAddForm({ label: "", amount: "", percentage: "", dueDate: "" });
    setFile(null); setShowAddForm(false); mutateMilestones();
  };

  const startEdit = (m: any) => {
    setEditForm({ label: m.label, amount: String(Number(m.amount)), dueDate: m.dueDate ? m.dueDate.split("T")[0] : "", status: m.status });
    setEditId(m.id); setEditFile(null); setShowAddForm(false);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append("label", editForm.label);
    fd.append("amount", editForm.amount);
    fd.append("status", editForm.status);
    if (editForm.dueDate) fd.append("dueDate", editForm.dueDate);
    if (editForm.status === "PAID") fd.append("paidDate", new Date().toISOString());
    if (editFile) fd.append("receipt", editFile);
    await fetch(`/api/nodes/${itemId}/milestones/${editId}`, { method: "PATCH", body: fd });
    setEditId(null); mutateMilestones();
  };

  const markPaid = async (mId: string) => {
    const fd = new FormData();
    fd.append("status", "PAID");
    fd.append("paidDate", new Date().toISOString());
    await fetch(`/api/nodes/${itemId}/milestones/${mId}`, { method: "PATCH", body: fd });
    mutateMilestones();
  };

  const deleteMilestone = async (mId: string) => {
    await fetch(`/api/nodes/${itemId}/milestones/${mId}`, { method: "DELETE" });
    mutateMilestones();
  };

  if (!milestones) return null;

  return (
    <div className="mt-3 border-t border-[var(--border-subtle)] pt-3">
      {/* Summary bar */}
      {milestones.length > 0 && (
        <div className="mb-3 flex items-center gap-3 text-xs">
          <span className="text-[var(--fg-muted)]">{t("costs.totalPaid")}: <strong className="text-[var(--success)]">{fmt(totalPaid)}</strong></span>
          <span className="text-[var(--fg-muted)]">/ {fmt(totalDue)}</span>
          {expectedCost && totalDue < Number(expectedCost) && (
            <span className="text-[var(--fg-muted)]">({fmt(Number(expectedCost) - totalDue)} {t("costs.totalRemaining").toLowerCase()})</span>
          )}
        </div>
      )}

      {/* Payments list */}
      {milestones.map((m: any) => (
        <div key={m.id} className="mb-2">
          {editId === m.id ? (
            /* ── Inline edit ── */
            <form onSubmit={handleEdit} className="rounded-lg border border-[var(--accent)]/30 bg-[var(--bg)] p-3 space-y-2">
              <button type="button" onClick={() => setEditId(null)} className="flex w-full items-center justify-between rounded-lg px-1 py-0.5 -mx-1 transition-colors hover:bg-[var(--border-subtle)]">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent)]">{t("crud.edit")}</p>
                <X size={12} className="text-[var(--fg-muted)]" />
              </button>
              <input type="text" placeholder={t("item.milestoneLabel")} value={editForm.label} onChange={(e) => setEditForm({ ...editForm, label: e.target.value })} required className={input} autoFocus />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input type="number" placeholder={t("item.amount")} value={editForm.amount} onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })} required className={input} />
                <input type="date" value={editForm.dueDate} onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })} className={input} />
                <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })} className={`${input} appearance-none`}>
                  <option value="PENDING">{t("status.PENDING")}</option>
                  <option value="DUE">{t("status.DUE")}</option>
                  <option value="PAID">{t("status.PAID")}</option>
                </select>
              </div>
              <div className="flex gap-2">
                <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-xs text-[var(--fg-muted)] hover:border-[var(--accent)]">
                  <Upload size={12} />
                  {editFile ? editFile.name.slice(0, 15) : "PDF"}
                  <input type="file" accept=".pdf" onChange={(e) => setEditFile(e.target.files?.[0] || null)} className="hidden" />
                </label>
                <button type="submit" className="flex-1 rounded-lg bg-[var(--accent)] py-2 text-xs font-semibold text-white">{t("task.save")}</button>
                <button type="button" onClick={() => setEditId(null)} className="rounded-lg bg-[var(--border-subtle)] px-4 py-2 text-xs text-[var(--fg-secondary)]">{t("task.cancel")}</button>
              </div>
            </form>
          ) : (
            /* ── Normal display ── */
            <div className="lift flex items-center justify-between gap-3 rounded-lg bg-[var(--bg)] p-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-semibold text-[var(--fg)]">{m.label}</p>
                  {m.percentage && <span className="text-[10px] text-[var(--fg-muted)]">({m.percentage}%)</span>}
                </div>
                <div className="mt-0.5 flex items-center gap-3 text-[11px] text-[var(--fg-muted)]">
                  <span className="font-medium">{fmt(Number(m.amount))}</span>
                  {m.dueDate && <span>{new Date(m.dueDate).toLocaleDateString(lang === "he" ? "he-IL" : "en-IL", { day: "numeric", month: "short" })}</span>}
                  {m.receiptUrl && (
                    <a href={m.receiptUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-0.5 text-[var(--accent)] hover:underline">
                      <FileText size={10} />{m.receiptName || "PDF"}
                    </a>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <StatusBadge status={m.status} />
                {m.status !== "PAID" && (
                  <button onClick={() => markPaid(m.id)} className="rounded-lg bg-[var(--success-soft)] p-2 text-[var(--success)] transition-all hover:bg-[var(--success)] hover:text-white" title={t("costs.markPaid")}>
                    <CheckCircle2 size={14} />
                  </button>
                )}
                <button onClick={() => editId === m.id ? setEditId(null) : startEdit(m)} className={`rounded-lg p-1.5 transition-all ${editId === m.id ? "bg-[var(--accent)] text-white hover:bg-[var(--alert)]" : "bg-[var(--fg)]/5 text-[var(--fg)] hover:bg-[var(--accent)] hover:text-white"}`} title={editId === m.id ? t("task.cancel") : t("crud.edit")}>
                  {editId === m.id ? <X size={12} /> : <Pencil size={12} />}
                </button>
                <button onClick={() => deleteMilestone(m.id)} className="rounded-lg bg-[var(--fg)]/5 p-1.5 text-[var(--fg)] transition-all hover:bg-[var(--alert)] hover:text-white">
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Add form */}
      {showAddForm ? (
        <form onSubmit={handleAdd} className="space-y-2 rounded-lg border border-dashed border-[var(--accent)]/30 bg-[var(--bg)] p-3">
          <button type="button" onClick={() => setShowAddForm(false)} className="flex w-full items-center justify-between rounded-lg px-1 py-0.5 -mx-1 transition-colors hover:bg-[var(--border-subtle)]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent)]">{t("item.addMilestone")}</p>
            <X size={12} className="text-[var(--fg-muted)]" />
          </button>
          <input type="text" placeholder={t("item.milestoneLabel")} value={addForm.label} onChange={(e) => setAddForm({ ...addForm, label: e.target.value })} required className={input} autoFocus />
          <div className="flex gap-2">
            <div className="flex rounded-lg border border-[var(--border)] text-[11px]">
              <button type="button" onClick={() => setInputMode("amount")} className={`px-3 py-2 ${inputMode === "amount" ? "bg-[var(--fg)] text-white" : "text-[var(--fg-muted)]"} rounded-s-lg`}>₪</button>
              <button type="button" onClick={() => setInputMode("pct")} className={`px-3 py-2 ${inputMode === "pct" ? "bg-[var(--fg)] text-white" : "text-[var(--fg-muted)]"} rounded-e-lg`}>%</button>
            </div>
            {inputMode === "amount" ? (
              <input type="number" placeholder={t("costs.inputAmount")} value={addForm.amount} onChange={(e) => setAddForm({ ...addForm, amount: e.target.value })} required className={`${input} flex-1`} />
            ) : (
              <input type="number" placeholder={t("costs.inputPercentage")} value={addForm.percentage} onChange={(e) => setAddForm({ ...addForm, percentage: e.target.value })} required min="1" max="100" className={`${input} flex-1`} />
            )}
          </div>
          <div className="flex gap-2">
            <input type="date" value={addForm.dueDate} onChange={(e) => setAddForm({ ...addForm, dueDate: e.target.value })} className={`${input} flex-1`} placeholder={t("item.dueDate")} />
            <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-xs text-[var(--fg-muted)] hover:border-[var(--accent)]">
              <Upload size={12} />
              {file ? file.name.slice(0, 15) : "PDF"}
              <input type="file" accept=".pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} className="hidden" />
            </label>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="flex-1 rounded-lg bg-[var(--accent)] py-2 text-xs font-semibold text-white">{t("task.save")}</button>
            <button type="button" onClick={() => setShowAddForm(false)} className="rounded-lg bg-[var(--border-subtle)] px-4 py-2 text-xs text-[var(--fg-secondary)]">{t("task.cancel")}</button>
          </div>
        </form>
      ) : (
        <button onClick={() => {
          const remaining = (expectedCost || 0) - totalDue;
          setAddForm({ ...addForm, amount: remaining > 0 ? String(remaining) : "", percentage: "" });
          setShowAddForm(true); setEditId(null);
        }} className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-[var(--accent)] hover:bg-[var(--accent-soft)]">
          <Plus size={13} />{t("item.addMilestone")}
        </button>
      )}
    </div>
  );
}
