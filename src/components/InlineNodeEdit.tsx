"use client";

import { useState } from "react";
import { useI18n, type TKey } from "@/lib/i18n";
import { apiPatch } from "@/hooks/useApi";
import { InlineCreateSelect } from "./InlineCreateSelect";
import { RoomMultiSelect } from "./RoomMultiSelect";
import { ChevronDown, X } from "lucide-react";
import { apiPost } from "@/hooks/useApi";

const input = "w-full rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--fg)] placeholder-[var(--fg-muted)]/60 outline-none transition-all focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/10";
const sel = "w-full appearance-none rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3 pe-9 text-sm text-[var(--fg)] outline-none transition-all focus:border-[var(--accent)]";

const statuses = ["NOT_STARTED","IN_PROGRESS","COMPLETED","ON_HOLD","PENDING","ORDERED","DELIVERED","INSTALLED","CANCELLED"] as const;

interface InlineNodeEditProps {
  node: any;
  projectId: string;
  allNodes: any[];
  vendors: any[];
  categories: any[];
  floors?: any[];
  tr: (s: string) => string;
  onDone: () => void;
  onCancel: () => void;
}

export function InlineNodeEdit({ node, projectId, allNodes, vendors, categories, floors, tr, onDone, onCancel }: InlineNodeEditProps) {
  const { t } = useI18n();
  const [form, setForm] = useState({
    name: node.name,
    parentId: node.parentId || "",
    vendorId: node.vendorId || "",
    categoryId: node.categoryId || "",
    expectedCost: node.expectedCost ? String(Number(node.expectedCost)) : "",
    expectedDate: node.expectedDate ? node.expectedDate.split("T")[0] : "",
    status: node.status,
    roomIds: node.rooms?.map((r: any) => r.roomId) || [],
  });
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    try {
      await apiPatch(`/api/nodes/${node.id}`, {
        name: form.name,
        parentId: form.parentId || null,
        vendorId: form.vendorId || null,
        categoryId: form.categoryId || null,
        expectedCost: form.expectedCost ? Number(form.expectedCost) : null,
        expectedDate: form.expectedDate || null,
        status: form.status,
        roomIds: form.roomIds,
      });
      onDone();
    } catch (err: any) { setError(err.message); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3" onClick={(e) => e.stopPropagation()}>
      <button type="button" onClick={onCancel} className="flex w-full items-center justify-between rounded-lg px-1 py-1 -mx-1 transition-colors hover:bg-[var(--border-subtle)]">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent)]">{t("crud.edit")}</p>
        <X size={14} className="text-[var(--fg-muted)] hover:text-[var(--fg)]" />
      </button>
      <input type="text" placeholder={t("task.name")} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className={input} autoFocus />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <select value={form.parentId} onChange={(e) => setForm({ ...form, parentId: e.target.value })} className={sel}>
            <option value="">{t("task.selectParent")}</option>
            {allNodes?.filter((n: any) => n.id !== node.id).map((n: any) => <option key={n.id} value={n.id}>{tr(n.name)}</option>)}
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute end-3.5 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]" />
        </div>
        <InlineCreateSelect
          value={form.categoryId} onChange={(c) => setForm({ ...form, categoryId: c })}
          options={(categories || []).map((c: any) => ({ id: c.id, name: c.name }))}
          placeholder={t("cat.selectCategory")} onCreateLabel={t("cat.name")} tr={tr}
          onCreate={async (name) => { const res = await apiPost("/api/categories", { name, projectId }); return res.id; }}
        />
        <InlineCreateSelect
          value={form.vendorId} onChange={(v) => setForm({ ...form, vendorId: v })}
          options={(vendors || []).map((v: any) => ({ id: v.id, name: v.name }))}
          placeholder={t("task.selectVendor")} onCreateLabel={t("vendor.name")} tr={tr}
          onCreate={async (name) => { const res = await apiPost("/api/vendors", { name, projectId }); return res.id; }}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <input type="number" placeholder={t("task.expected")} value={form.expectedCost} onChange={(e) => setForm({ ...form, expectedCost: e.target.value })} className={input} />
        <input type="date" value={form.expectedDate} onChange={(e) => setForm({ ...form, expectedDate: e.target.value })} className={input} />
        <div className="relative">
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={sel}>
            {statuses.map((s) => <option key={s} value={s}>{t(`status.${s}` as TKey)}</option>)}
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute end-3.5 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]" />
        </div>
      </div>
      {floors && floors.length > 0 && (
        <RoomMultiSelect value={form.roomIds} onChange={(ids) => setForm({ ...form, roomIds: ids })} floors={floors} tr={tr} />
      )}
      {error && <p className="text-xs font-medium text-[var(--alert)]">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" className="flex-1 rounded-xl bg-[var(--accent)] py-2.5 text-sm font-semibold text-white">{t("task.save")}</button>
        <button type="button" onClick={onCancel} className="rounded-xl bg-[var(--border-subtle)] px-5 py-2.5 text-sm text-[var(--fg-secondary)]">{t("task.cancel")}</button>
      </div>
    </form>
  );
}
