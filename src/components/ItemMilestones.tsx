"use client";

import { useState } from "react";
import { useI18n, type TKey } from "@/lib/i18n";
import { useApi } from "@/hooks/useApi";
import { StatusBadge } from "./StatusBadge";
import { Plus, Upload, CheckCircle2, Trash2, FileText } from "lucide-react";
import { mutate } from "swr";

const input = "w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--fg)] placeholder-[var(--fg-muted)]/60 outline-none focus:border-[var(--accent)]";

interface Props {
  itemId: string;
  expectedCost: number | null;
}

export function ItemMilestones({ itemId, expectedCost }: Props) {
  const { t, lang } = useI18n();
  const [showForm, setShowForm] = useState(false);
  const [inputMode, setInputMode] = useState<"amount" | "pct">("amount");
  const [form, setForm] = useState({ label: "", amount: "", percentage: "", dueDate: "" });
  const [file, setFile] = useState<File | null>(null);

  const { data: milestones } = useApi<any[]>(`/api/nodes/${itemId}/milestones`);

  const fmt = (n: number) =>
    new Intl.NumberFormat(lang === "he" ? "he-IL" : "en-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(n);

  const totalPaid = milestones?.filter((m: any) => m.status === "PAID").reduce((s: number, m: any) => s + Number(m.amount), 0) || 0;
  const totalDue = milestones?.reduce((s: number, m: any) => s + Number(m.amount), 0) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append("label", form.label);
    if (inputMode === "pct") fd.append("percentage", form.percentage);
    else fd.append("amount", form.amount);
    if (form.dueDate) fd.append("dueDate", form.dueDate);
    if (file) fd.append("receipt", file);

    await fetch(`/api/nodes/${itemId}/milestones`, { method: "POST", body: fd });
    setForm({ label: "", amount: "", percentage: "", dueDate: "" });
    setFile(null); setShowForm(false);
    mutate(`/api/nodes/${itemId}/milestones`);
  };

  const markPaid = async (mId: string) => {
    const fd = new FormData();
    fd.append("status", "PAID");
    fd.append("paidDate", new Date().toISOString());
    await fetch(`/api/nodes/${itemId}/milestones/${mId}`, { method: "PATCH", body: fd });
    mutate(`/api/nodes/${itemId}/milestones`);
  };

  const deleteMilestone = async (mId: string) => {
    await fetch(`/api/nodes/${itemId}/milestones/${mId}`, { method: "DELETE" });
    mutate(`/api/nodes/${itemId}/milestones`);
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

      {/* Milestones list */}
      {milestones.map((m: any) => (
        <div key={m.id} className="lift mb-2 flex items-center justify-between gap-3 rounded-lg bg-[var(--bg)] p-3">
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
                <CheckCircle2 size={16} />
              </button>
            )}
            <button onClick={() => deleteMilestone(m.id)} className="rounded-lg bg-[var(--fg)]/5 p-1.5 text-[var(--fg)] transition-all hover:bg-[var(--alert)] hover:text-white">
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      ))}

      {/* Add form */}
      {showForm ? (
        <form onSubmit={handleSubmit} className="space-y-2 rounded-lg bg-[var(--bg)] p-3">
          <input type="text" placeholder={t("item.milestoneLabel")} value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} required className={input} />
          <div className="flex gap-2">
            <div className="flex rounded-lg border border-[var(--border)] text-[11px]">
              <button type="button" onClick={() => setInputMode("amount")} className={`px-3 py-2 ${inputMode === "amount" ? "bg-[var(--fg)] text-white" : "text-[var(--fg-muted)]"} rounded-s-lg`}>₪</button>
              <button type="button" onClick={() => setInputMode("pct")} className={`px-3 py-2 ${inputMode === "pct" ? "bg-[var(--fg)] text-white" : "text-[var(--fg-muted)]"} rounded-e-lg`}>%</button>
            </div>
            {inputMode === "amount" ? (
              <input type="number" placeholder={t("costs.inputAmount")} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required className={`${input} flex-1`} />
            ) : (
              <input type="number" placeholder={t("costs.inputPercentage")} value={form.percentage} onChange={(e) => setForm({ ...form, percentage: e.target.value })} required min="1" max="100" className={`${input} flex-1`} />
            )}
          </div>
          <div className="flex gap-2">
            <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className={`${input} flex-1`} placeholder={t("item.dueDate")} />
            <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-xs text-[var(--fg-muted)] hover:border-[var(--accent)]">
              <Upload size={12} />
              {file ? file.name.slice(0, 15) : "PDF"}
              <input type="file" accept=".pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} className="hidden" />
            </label>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="flex-1 rounded-lg bg-[var(--accent)] py-2 text-xs font-semibold text-white">{t("task.save")}</button>
            <button type="button" onClick={() => setShowForm(false)} className="rounded-lg bg-[var(--border-subtle)] px-4 py-2 text-xs text-[var(--fg-secondary)]">{t("task.cancel")}</button>
          </div>
        </form>
      ) : (
        <button onClick={() => {
          // Pre-fill with remaining unpaid amount
          const remaining = (expectedCost || 0) - totalDue;
          setForm({ ...form, amount: remaining > 0 ? String(remaining) : "", percentage: "" });
          setShowForm(true);
        }} className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-[var(--accent)] hover:bg-[var(--accent-soft)]">
          <Plus size={13} />{t("item.addMilestone")}
        </button>
      )}
    </div>
  );
}
