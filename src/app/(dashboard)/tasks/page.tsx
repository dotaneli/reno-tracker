"use client";

import { useState, useMemo } from "react";
import { useProject } from "@/hooks/useProject";
import { useI18n, type TKey } from "@/lib/i18n";
import { useApi, apiPost, apiPatch } from "@/hooks/useApi";
import { useTranslate } from "@/hooks/useTranslate";
import { Card } from "@/components/Card";
import { NodeTree } from "@/components/NodeTree";
import { InlineCreateSelect } from "@/components/InlineCreateSelect";
import { Plus, X, ChevronDown } from "lucide-react";
import { mutate } from "swr";

const input = "w-full rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--fg)] placeholder-[var(--fg-muted)]/60 outline-none transition-all focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/10";
const sel = "w-full appearance-none rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3 pe-9 text-sm text-[var(--fg)] outline-none transition-all focus:border-[var(--accent)]";

const nodeTypes = ["PLUMBING","ELECTRICAL","CARPENTRY","PAINTING","FLOORING","SMART_HOME","AUDIO_VISUAL","HVAC","WINDOWS_DOORS","KITCHEN","BATHROOM","GENERAL"] as const;
const statuses = ["NOT_STARTED","IN_PROGRESS","COMPLETED","ON_HOLD","PENDING","ORDERED","DELIVERED","INSTALLED","CANCELLED"] as const;

export default function InventoryPage() {
  const { t } = useI18n();
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editNodeId, setEditNodeId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const { activeProject: project } = useProject();
  const { data: tree } = useApi<any[]>(project ? `/api/nodes?projectId=${project.id}&tree=true` : null);
  const { data: allNodesFlat } = useApi<any[]>(project ? `/api/nodes?projectId=${project.id}` : null);
  const { data: vendors } = useApi<any[]>(project ? `/api/vendors?projectId=${project.id}` : null);
  const { data: categories } = useApi<any[]>(project ? `/api/categories?projectId=${project.id}` : null);

  const allTexts = useMemo(() => [
    ...(allNodesFlat?.map((n: any) => n.name) || []),
    ...(vendors?.map((v: any) => v.name) || []),
    ...(categories?.map((c: any) => c.name) || []),
  ], [allNodesFlat, vendors]);
  const tr = useTranslate(allTexts);

  const mutateAll = () => { mutate(`/api/nodes?projectId=${project?.id}&tree=true`); mutate(`/api/nodes?projectId=${project?.id}`); mutate(`/api/vendors?projectId=${project?.id}`); mutate(`/api/categories?projectId=${project?.id}`); };

  const rootCount = tree?.length || 0;
  const totalCount = allNodesFlat?.length || 0;

  const [addForm, setAddForm] = useState({ name: "", categoryId: "", vendorId: "", expectedCost: "", expectedDate: "" });
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    try {
      const data: any = { name: addForm.name, projectId: project.id };
      if (addForm.categoryId) data.categoryId = addForm.categoryId;
      if (addForm.vendorId) data.vendorId = addForm.vendorId;
      if (addForm.expectedCost) data.expectedCost = Number(addForm.expectedCost);
      if (addForm.expectedDate) data.expectedDate = addForm.expectedDate;
      await apiPost("/api/nodes", data);
      setAddForm({ name: "", categoryId: "", vendorId: "", expectedCost: "", expectedDate: "" });
      setShowAddForm(false); mutateAll();
    } catch (err: any) { setError(err.message); }
  };

  const [editForm, setEditForm] = useState({ name: "", parentId: "", vendorId: "", categoryId: "", expectedCost: "", expectedDate: "", status: "PENDING" });
  const startEdit = (node: any) => {
    setEditForm({ name: node.name, parentId: node.parentId || "", vendorId: node.vendorId || "", categoryId: node.categoryId || "", expectedCost: node.expectedCost ? String(Number(node.expectedCost)) : "", expectedDate: node.expectedDate ? node.expectedDate.split("T")[0] : "", status: node.status });
    setEditNodeId(node.id); setShowEditForm(true); setShowAddForm(false);
  };
  const resetEdit = () => { setEditForm({ name: "", parentId: "", vendorId: "", categoryId: "", expectedCost: "", expectedDate: "", status: "PENDING" }); setEditNodeId(null); setShowEditForm(false); };
  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    try {
      await apiPatch(`/api/nodes/${editNodeId}`, { name: editForm.name, parentId: editForm.parentId || null, vendorId: editForm.vendorId || null, categoryId: editForm.categoryId || null, expectedCost: editForm.expectedCost ? Number(editForm.expectedCost) : null, expectedDate: editForm.expectedDate || null, status: editForm.status });
      resetEdit(); mutateAll();
    } catch (err: any) { setError(err.message); }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--fg)]">{t("task.title")}</h1>
          <p className="mt-0.5 text-sm text-[var(--fg-muted)]">{rootCount} {t("dash.groups").toLowerCase()} · {totalCount} {t("dash.tasks").toLowerCase()}</p>
        </div>
        <button onClick={() => { setShowAddForm(!showAddForm); setShowEditForm(false); }}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${showAddForm ? "bg-[var(--border-subtle)] text-[var(--fg-secondary)]" : "bg-[var(--fg)] text-[var(--bg-elevated)] shadow-lg shadow-[var(--fg)]/10"}`}>
          {showAddForm ? <X size={16} /> : <Plus size={16} />}
          {showAddForm ? t("task.cancel") : t("task.addTask")}
        </button>
      </div>

      {showAddForm && (
        <Card glow>
          <form onSubmit={handleAdd} className="space-y-3">
            <input type="text" placeholder={t("task.name")} value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} required className={input} />
            <div className="grid grid-cols-3 gap-3">
              <InlineCreateSelect
                value={addForm.categoryId} onChange={(c) => setAddForm({ ...addForm, categoryId: c })}
                options={(categories || []).map((c: any) => ({ id: c.id, name: c.name }))}
                placeholder={t("cat.selectCategory")} onCreateLabel={t("cat.name")} tr={tr}
                onCreate={async (name) => { const res = await apiPost("/api/categories", { name, projectId: project.id }); mutateAll(); return res.id; }}
              />
              <InlineCreateSelect
                value={addForm.vendorId} onChange={(v) => setAddForm({ ...addForm, vendorId: v })}
                options={(vendors || []).map((v: any) => ({ id: v.id, name: v.name }))}
                placeholder={t("task.selectVendor")} onCreateLabel={t("vendor.name")} tr={tr}
                onCreate={async (name) => { const res = await apiPost("/api/vendors", { name, projectId: project.id }); mutateAll(); return res.id; }}
              />
              <input type="number" placeholder="₪" value={addForm.expectedCost} onChange={(e) => setAddForm({ ...addForm, expectedCost: e.target.value })} className={input} />
            </div>
            {error && !showEditForm && <p className="text-xs font-medium text-[var(--alert)]">{error}</p>}
            <button type="submit" className="w-full rounded-xl bg-[var(--accent)] py-3 text-sm font-semibold text-white shadow-md shadow-[var(--accent)]/20">{t("task.save")}</button>
          </form>
        </Card>
      )}

      {showEditForm && editNodeId && (
        <Card glow>
          <p className="mb-3 text-xs font-semibold text-[var(--fg-muted)]">{t("crud.edit")}</p>
          <form onSubmit={handleEdit} className="space-y-3">
            <input type="text" placeholder={t("task.name")} value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required className={input} />
            <div className="grid grid-cols-3 gap-3">
              <div className="relative">
                <select value={editForm.parentId} onChange={(e) => setEditForm({ ...editForm, parentId: e.target.value })} className={sel}>
                  <option value="">{t("task.selectParent")}</option>
                  {allNodesFlat?.filter((n: any) => n.id !== editNodeId).map((n: any) => <option key={n.id} value={n.id}>{tr(n.name)}</option>)}
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute end-3.5 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]" />
              </div>
              <InlineCreateSelect
                value={editForm.categoryId} onChange={(c) => setEditForm({ ...editForm, categoryId: c })}
                options={(categories || []).map((c: any) => ({ id: c.id, name: c.name }))}
                placeholder={t("cat.selectCategory")} onCreateLabel={t("cat.name")} tr={tr}
                onCreate={async (name) => { const res = await apiPost("/api/categories", { name, projectId: project.id }); mutateAll(); return res.id; }}
              />
              <InlineCreateSelect
                value={editForm.vendorId} onChange={(v) => setEditForm({ ...editForm, vendorId: v })}
                options={(vendors || []).map((v: any) => ({ id: v.id, name: v.name }))}
                placeholder={t("task.selectVendor")} onCreateLabel={t("vendor.name")} tr={tr}
                onCreate={async (name) => { const res = await apiPost("/api/vendors", { name, projectId: project.id }); mutateAll(); return res.id; }}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <input type="number" placeholder={t("task.expected")} value={editForm.expectedCost} onChange={(e) => setEditForm({ ...editForm, expectedCost: e.target.value })} className={input} />
              <input type="date" value={editForm.expectedDate} onChange={(e) => setEditForm({ ...editForm, expectedDate: e.target.value })} className={input} />
              <div className="relative">
                <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })} className={sel}>
                  {statuses.map((s) => <option key={s} value={s}>{t(`status.${s}` as TKey)}</option>)}
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute end-3.5 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]" />
              </div>
            </div>
            {error && <p className="text-xs font-medium text-[var(--alert)]">{error}</p>}
            <div className="flex gap-3">
              <button type="submit" className="flex-1 rounded-xl bg-[var(--accent)] py-3 text-sm font-semibold text-white">{t("task.save")}</button>
              <button type="button" onClick={resetEdit} className="rounded-xl bg-[var(--border-subtle)] px-6 py-3 text-sm text-[var(--fg-secondary)]">{t("task.cancel")}</button>
            </div>
          </form>
        </Card>
      )}

      {!tree ? (
        <p className="py-16 text-center text-sm text-[var(--fg-muted)]">{t("general.loading")}</p>
      ) : tree.length === 0 ? (
        <Card><p className="py-12 text-center text-sm text-[var(--fg-muted)]">{t("task.noTasks")}</p></Card>
      ) : (
        <NodeTree nodes={tree} projectId={project.id} vendors={vendors || []} categories={categories || []} onMutate={mutateAll} onEdit={startEdit} tr={tr} />
      )}
    </div>
  );
}
