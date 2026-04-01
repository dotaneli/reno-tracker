"use client";

import { useState, useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { useApi } from "@/hooks/useApi";
import { StatusBadge } from "./StatusBadge";
import { Plus, Upload, CheckCircle2, Trash2, FileText, Pencil, X, ChevronDown } from "lucide-react";
import { mutate } from "swr";

const input = "w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--fg)] placeholder-[var(--fg-muted)]/60 outline-none focus:border-[var(--accent)]";

interface Props {
  itemId: string;
  expectedCost: number | null;
  onMutate?: () => void;
  prefetchedMilestones?: any[];
}

/** Check if a milestone is overdue: status not PAID and dueDate in the past */
function isOverdue(m: any): boolean {
  if (m.status === "PAID") return false;
  if (!m.dueDate) return false;
  return new Date(m.dueDate) < new Date(new Date().toDateString());
}

export function ItemMilestones({ itemId, expectedCost, onMutate: onParentMutate, prefetchedMilestones }: Props) {
  const { t, lang } = useI18n();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<"amount" | "pct">("amount");
  const [addForm, setAddForm] = useState({ label: "", amount: "", percentage: "", dueDate: "" });
  const [editForm, setEditForm] = useState({ label: "", amount: "", dueDate: "", status: "PENDING" });
  const [file, setFile] = useState<File | null>(null);
  const [editFile, setEditFile] = useState<File | null>(null);
  const [showPaid, setShowPaid] = useState(false);

  // Use prefetched data if available, otherwise fetch per-item (fallback)
  const { data: fetchedMilestones } = useApi<any[]>(prefetchedMilestones ? null : `/api/nodes/${itemId}/milestones`, { keepPreviousData: true });
  const milestones = prefetchedMilestones || fetchedMilestones;
  const mutateMilestones = () => { mutate(`/api/nodes/${itemId}/milestones`); onParentMutate?.(); };

  const fmt = (n: number) =>
    new Intl.NumberFormat(lang === "he" ? "he-IL" : "en-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(n);

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString(lang === "he" ? "he-IL" : "en-IL", { day: "numeric", month: "short", year: "numeric" });

  const totalPaid = milestones?.filter((m: any) => m.status === "PAID").reduce((s: number, m: any) => s + Number(m.amount), 0) || 0;
  const totalDue = milestones?.reduce((s: number, m: any) => s + Number(m.amount), 0) || 0;

  // Group milestones into sections
  const { overdue, pending, paid } = useMemo(() => {
    if (!milestones) return { overdue: [], pending: [], paid: [] };
    const overdue: any[] = [];
    const pending: any[] = [];
    const paid: any[] = [];
    for (const m of milestones) {
      if (m.status === "PAID") {
        paid.push(m);
      } else if (isOverdue(m)) {
        overdue.push(m);
      } else {
        pending.push(m);
      }
    }
    return { overdue, pending, paid };
  }, [milestones]);

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

  // ── Render a single milestone card ──
  const renderCard = (m: any) => {
    const isPaid = m.status === "PAID";
    const mOverdue = isOverdue(m);

    // Determine card style
    let borderColor = "border-s-amber-500"; // pending/due default
    let bgColor = "bg-[var(--bg-elevated)]";
    if (isPaid) {
      borderColor = "border-s-[var(--success)]";
      bgColor = "bg-[var(--success-soft)]";
    } else if (mOverdue) {
      borderColor = "border-s-[var(--alert)]";
      bgColor = "bg-[var(--alert-soft)]";
    }

    if (editId === m.id) {
      return (
        <form key={m.id} onSubmit={handleEdit} className="rounded-lg border border-[var(--accent)]/30 bg-[var(--bg)] p-3 space-y-2">
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
      );
    }

    return (
      <div key={m.id} className={`rounded-lg border-s-4 ${borderColor} ${bgColor} p-3 ${mOverdue ? "animate-[pulse-border_2s_ease-in-out_infinite]" : ""}`}>
        <div className="flex items-start justify-between gap-2">
          {/* Left: info */}
          <div className="min-w-0 flex-1">
            <p className={`text-sm font-bold ${mOverdue ? "text-[var(--alert)]" : "text-[var(--fg)]"}`}>{fmt(Number(m.amount))}</p>
            <p className="text-xs text-[var(--fg-muted)] mt-0.5">
              {m.label}
              {m.percentage && <span className="ms-1">({m.percentage}%)</span>}
            </p>
            {isPaid && m.paidDate && (
              <p className="text-xs text-[var(--success)] mt-0.5">{t("milestone.paid")} · {fmtDate(m.paidDate)}</p>
            )}
            {mOverdue && m.dueDate && (
              <p className="text-xs text-[var(--alert)] mt-0.5">{t("milestone.overdueWas")} {fmtDate(m.dueDate)}</p>
            )}
            {!isPaid && !mOverdue && m.dueDate && (
              <p className="text-xs text-[var(--fg-muted)] mt-0.5">{fmtDate(m.dueDate)}</p>
            )}
            {m.receiptUrl && (
              <a href={m.receiptUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-0.5 text-xs text-[var(--accent)] hover:underline">
                <FileText size={10} />{m.receiptName || "PDF"}
              </a>
            )}
          </div>

          {/* Right: small icon buttons */}
          <div className="flex shrink-0 items-center gap-0.5">
            <button onClick={() => startEdit(m)} className="rounded-md p-1.5 text-[var(--fg-muted)] transition-all hover:bg-[var(--fg)]/5 hover:text-[var(--fg)]" title={t("crud.edit")}>
              <Pencil size={12} />
            </button>
            <button onClick={() => deleteMilestone(m.id)} className="rounded-md p-1.5 text-[var(--fg-muted)] transition-all hover:bg-[var(--alert-soft)] hover:text-[var(--alert)]" title={t("crud.delete")}>
              <Trash2 size={12} />
            </button>
          </div>
        </div>

        {/* Mark as Paid button — full width for unpaid milestones */}
        {!isPaid && (
          <button
            onClick={() => markPaid(m.id)}
            className={`mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-semibold text-white transition-all ${
              mOverdue
                ? "bg-[var(--alert)] hover:bg-[var(--alert)]/90 shadow-md shadow-[var(--alert)]/20"
                : "bg-[var(--accent)] hover:bg-[var(--accent)]/90 shadow-md shadow-[var(--accent)]/20"
            }`}
          >
            <CheckCircle2 size={14} /> {t("costs.markPaid")}
          </button>
        )}
      </div>
    );
  };

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

      {/* ── OVERDUE section ── */}
      {overdue.length > 0 && (
        <div className="mb-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[var(--alert)]">{t("milestone.overdue")}</p>
          <div className="space-y-2">
            {overdue.map(renderCard)}
          </div>
        </div>
      )}

      {/* ── PENDING/DUE section ── */}
      {pending.length > 0 && (
        <div className="mb-3">
          {(overdue.length > 0 || paid.length > 0) && (
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[var(--fg-muted)]">{t("milestone.pending")}</p>
          )}
          <div className="space-y-2">
            {pending.map(renderCard)}
          </div>
        </div>
      )}

      {/* ── PAID section (collapsed by default) ── */}
      {paid.length > 0 && (
        <div className="mb-3">
          <button
            onClick={() => setShowPaid(!showPaid)}
            className="mb-2 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[var(--success)] hover:text-[var(--success)]/80 transition-colors"
          >
            <ChevronDown size={12} className={`transition-transform ${showPaid ? "rotate-180" : ""}`} />
            {showPaid ? t("milestone.hidePaid") : t("milestone.showPaid")} ({paid.length})
          </button>
          {showPaid && (
            <div className="space-y-2">
              {paid.map(renderCard)}
            </div>
          )}
        </div>
      )}

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
