"use client";

import { useState, useMemo } from "react";
import { useProject } from "@/hooks/useProject";
import { useI18n, type TKey } from "@/lib/i18n";
import { useApi, apiPost, apiPatch } from "@/hooks/useApi";
import { useTranslate } from "@/hooks/useTranslate";
import { useFinancials } from "@/hooks/useFinancials";
import { Card } from "@/components/Card";
import { NodeTree } from "@/components/NodeTree";
import { InlineCreateSelect } from "@/components/InlineCreateSelect";
import { RoomMultiSelect } from "@/components/RoomMultiSelect";
import { StatusBadge } from "@/components/StatusBadge";
import { Plus, X, ChevronDown, Search, List, LayoutGrid, ArrowUpDown, Wallet } from "lucide-react";
import { mutate } from "swr";

const input = "w-full rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--fg)] placeholder-[var(--fg-muted)]/60 outline-none transition-all focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/10";
const sel = "w-full appearance-none rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3 pe-9 text-sm text-[var(--fg)] outline-none transition-all focus:border-[var(--accent)]";

const statuses = ["NOT_STARTED","IN_PROGRESS","COMPLETED","ON_HOLD","PENDING","ORDERED","DELIVERED","INSTALLED","CANCELLED"] as const;

type SortKey = "default" | "price" | "category" | "vendor" | "status" | "payment";
type ViewMode = "list" | "cards";

export default function TasksPage() {
  const { t, lang } = useI18n();
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editNodeId, setEditNodeId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("default");

  const { activeProject: project } = useProject();
  const { data: tree } = useApi<any[]>(project ? `/api/nodes?projectId=${project.id}&tree=true` : null);
  const { data: allNodesFlat } = useApi<any[]>(project ? `/api/nodes?projectId=${project.id}` : null);
  const { data: vendors } = useApi<any[]>(project ? `/api/vendors?projectId=${project.id}` : null);
  const { data: categories } = useApi<any[]>(project ? `/api/categories?projectId=${project.id}` : null);
  const { data: floors } = useApi<any[]>(project ? `/api/floors?projectId=${project.id}` : null);
  const fin = useFinancials(project?.id);

  const allTexts = useMemo(() => [
    ...(allNodesFlat?.map((n: any) => n.name) || []),
    ...(vendors?.map((v: any) => v.name) || []),
    ...(categories?.map((c: any) => c.name) || []),
  ], [allNodesFlat, vendors, categories]);
  const tr = useTranslate(allTexts);

  const mutateAll = () => { mutate(`/api/nodes?projectId=${project?.id}&tree=true`); mutate(`/api/nodes?projectId=${project?.id}`); mutate(`/api/vendors?projectId=${project?.id}`); mutate(`/api/categories?projectId=${project?.id}`); };

  const fmt = (n: number) => new Intl.NumberFormat(lang === "he" ? "he-IL" : "en-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(n);

  // ── Search & Sort (for card view — operates on flat list) ──
  const filteredNodes = useMemo(() => {
    let nodes = allNodesFlat || [];
    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      nodes = nodes.filter((n: any) =>
        n.name?.toLowerCase().includes(q) ||
        n.vendor?.name?.toLowerCase().includes(q) ||
        n.category?.name?.toLowerCase().includes(q) ||
        tr(n.name)?.toLowerCase().includes(q)
      );
    }
    // Sort
    if (sortKey !== "default") {
      nodes = [...nodes].sort((a: any, b: any) => {
        switch (sortKey) {
          case "price": return (Number(b.expectedCost) || 0) - (Number(a.expectedCost) || 0);
          case "category": return (a.category?.name || "zzz").localeCompare(b.category?.name || "zzz");
          case "vendor": return (a.vendor?.name || "zzz").localeCompare(b.vendor?.name || "zzz");
          case "status": return (a.status || "").localeCompare(b.status || "");
          case "payment": {
            const pctA = Number(a.expectedCost) > 0 ? (Number(a._paid || 0) / Number(a.expectedCost)) : 0;
            const pctB = Number(b.expectedCost) > 0 ? (Number(b._paid || 0) / Number(b.expectedCost)) : 0;
            return pctB - pctA;
          }
          default: return 0;
        }
      });
    }
    return nodes;
  }, [allNodesFlat, searchQuery, sortKey, tr]);

  // Filter tree for search (in list view)
  const filteredTree = useMemo(() => {
    if (!tree || !searchQuery.trim()) return tree;
    const q = searchQuery.toLowerCase();
    function matchesSearch(node: any): boolean {
      if (node.name?.toLowerCase().includes(q) || tr(node.name)?.toLowerCase().includes(q) ||
          node.vendor?.name?.toLowerCase().includes(q) || node.category?.name?.toLowerCase().includes(q))
        return true;
      return node.children?.some((c: any) => matchesSearch(c)) || false;
    }
    function filterNode(node: any): any | null {
      if (matchesSearch(node)) {
        return { ...node, children: node.children?.map(filterNode).filter(Boolean) || [] };
      }
      return null;
    }
    return tree.map(filterNode).filter(Boolean);
  }, [tree, searchQuery, tr]);

  const rootCount = tree?.length || 0;
  const totalCount = allNodesFlat?.length || 0;

  // ── Forms ──
  const [addForm, setAddForm] = useState({ name: "", categoryId: "", vendorId: "", expectedCost: "", expectedDate: "", roomIds: [] as string[] });
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    if (!project) return;
    try {
      const data: any = { name: addForm.name, projectId: project.id };
      if (addForm.categoryId) data.categoryId = addForm.categoryId;
      if (addForm.vendorId) data.vendorId = addForm.vendorId;
      if (addForm.expectedCost) data.expectedCost = Number(addForm.expectedCost);
      if (addForm.expectedDate) data.expectedDate = addForm.expectedDate;
      if (addForm.roomIds.length) data.roomIds = addForm.roomIds;
      await apiPost("/api/nodes", data);
      setAddForm({ name: "", categoryId: "", vendorId: "", expectedCost: "", expectedDate: "", roomIds: [] });
      setShowAddForm(false); mutateAll();
    } catch (err: any) { setError(err.message); }
  };

  const [editForm, setEditForm] = useState({ name: "", parentId: "", vendorId: "", categoryId: "", expectedCost: "", expectedDate: "", status: "PENDING", roomIds: [] as string[] });
  const startEdit = (node: any) => {
    setEditForm({ name: node.name, parentId: node.parentId || "", vendorId: node.vendorId || "", categoryId: node.categoryId || "", expectedCost: node.expectedCost ? String(Number(node.expectedCost)) : "", expectedDate: node.expectedDate ? node.expectedDate.split("T")[0] : "", status: node.status, roomIds: node.rooms?.map((r: any) => r.roomId) || [] });
    setEditNodeId(node.id); setShowEditForm(true); setShowAddForm(false);
  };
  const resetEdit = () => { setEditForm({ name: "", parentId: "", vendorId: "", categoryId: "", expectedCost: "", expectedDate: "", status: "PENDING", roomIds: [] }); setEditNodeId(null); setShowEditForm(false); };
  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    if (!project) return;
    try {
      await apiPatch(`/api/nodes/${editNodeId}`, { name: editForm.name, parentId: editForm.parentId || null, vendorId: editForm.vendorId || null, categoryId: editForm.categoryId || null, expectedCost: editForm.expectedCost ? Number(editForm.expectedCost) : null, expectedDate: editForm.expectedDate || null, status: editForm.status, roomIds: editForm.roomIds });
      resetEdit(); mutateAll();
    } catch (err: any) { setError(err.message); }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
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

      {/* Budget Bar */}
      {!fin.loading && (
        <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-[var(--fg)] px-4 py-3 md:px-6 md:py-4 text-[var(--bg-elevated)]">
          <div className="flex items-center gap-2">
            <Wallet size={16} className="text-[var(--accent)]" />
            <span className="text-xs font-medium opacity-70">{t("dash.budget")}</span>
            <span className="text-sm font-bold">{fmt(fin.totalBudget)}</span>
          </div>
          <div className="h-4 w-px bg-white/20 hidden sm:block" />
          <div className="flex items-center gap-1.5 text-xs">
            <span className="opacity-70">{t("costs.totalCost")}</span>
            <span className="font-bold">{fmt(fin.totalCost)}</span>
          </div>
          <div className="h-4 w-px bg-white/20 hidden sm:block" />
          <div className="flex items-center gap-1.5 text-xs">
            <span className="opacity-70">{t("costs.totalPaid")}</span>
            <span className="font-bold text-[#78B080]">{fmt(fin.totalPaid)}</span>
          </div>
          <div className="h-4 w-px bg-white/20 hidden sm:block" />
          <div className="flex items-center gap-1.5 text-xs">
            <span className="opacity-70">{t("costs.totalRemaining")}</span>
            <span className="font-bold text-amber-300">{fmt(fin.remainingToPay)}</span>
          </div>
          {fin.unscheduled > 0 && (
            <>
              <div className="h-4 w-px bg-white/20 hidden sm:block" />
              <div className="flex items-center gap-1.5 text-xs">
                <span className="opacity-70">{t("costs.unscheduled")}</span>
                <span className="font-bold text-red-400">{fmt(fin.unscheduled)}</span>
              </div>
            </>
          )}
          <div className="ms-auto flex items-center gap-1.5 text-xs">
            <span className="opacity-70">{t("task.budgetRemaining")}</span>
            <span className={`font-bold ${fin.budgetRemaining >= 0 ? "text-[#78B080]" : "text-red-400"}`}>{fmt(fin.budgetRemaining)}</span>
          </div>
        </div>
      )}

      {/* Search + Sort + View Toggle */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("task.search")}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] py-2.5 pe-4 ps-10 text-sm text-[var(--fg)] placeholder-[var(--fg-muted)]/60 outline-none transition-all focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/10"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute end-3 top-1/2 -translate-y-1/2 text-[var(--fg-muted)] hover:text-[var(--fg)]">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Sort */}
        <div className="relative">
          <ArrowUpDown size={14} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]" />
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="appearance-none rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] py-2.5 pe-8 ps-9 text-xs font-medium text-[var(--fg)] outline-none transition-all focus:border-[var(--accent)]"
          >
            <option value="default">{t("task.sortDefault")}</option>
            <option value="price">{t("task.sortPrice")}</option>
            <option value="category">{t("task.sortCategory")}</option>
            <option value="vendor">{t("task.sortVendor")}</option>
            <option value="status">{t("task.sortStatus")}</option>
            <option value="payment">{t("task.sortPayment")}</option>
          </select>
          <ChevronDown size={12} className="pointer-events-none absolute end-2.5 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]" />
        </div>

        {/* View Toggle */}
        <div className="flex rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-0.5">
          <button
            onClick={() => setViewMode("list")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${viewMode === "list" ? "bg-[var(--fg)] text-[var(--bg-elevated)] shadow-sm" : "text-[var(--fg-muted)] hover:text-[var(--fg)]"}`}
          >
            <List size={14} /> {t("task.viewList")}
          </button>
          <button
            onClick={() => setViewMode("cards")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${viewMode === "cards" ? "bg-[var(--fg)] text-[var(--bg-elevated)] shadow-sm" : "text-[var(--fg-muted)] hover:text-[var(--fg)]"}`}
          >
            <LayoutGrid size={14} /> {t("task.viewCards")}
          </button>
        </div>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <Card glow>
          <form onSubmit={handleAdd} className="space-y-3">
            <input type="text" placeholder={t("task.name")} value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} required className={input} />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
            {floors && floors.length > 0 && (
              <RoomMultiSelect value={addForm.roomIds} onChange={(ids) => setAddForm({ ...addForm, roomIds: ids })} floors={floors} tr={tr} />
            )}
            {error && !showEditForm && <p className="text-xs font-medium text-[var(--alert)]">{error}</p>}
            <button type="submit" className="w-full rounded-xl bg-[var(--accent)] py-3 text-sm font-semibold text-white shadow-md shadow-[var(--accent)]/20">{t("task.save")}</button>
          </form>
        </Card>
      )}

      {/* Edit Form */}
      {showEditForm && editNodeId && (
        <Card glow>
          <p className="mb-3 text-xs font-semibold text-[var(--fg-muted)]">{t("crud.edit")}</p>
          <form onSubmit={handleEdit} className="space-y-3">
            <input type="text" placeholder={t("task.name")} value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required className={input} />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input type="number" placeholder={t("task.expected")} value={editForm.expectedCost} onChange={(e) => setEditForm({ ...editForm, expectedCost: e.target.value })} className={input} />
              <input type="date" value={editForm.expectedDate} onChange={(e) => setEditForm({ ...editForm, expectedDate: e.target.value })} className={input} />
              <div className="relative">
                <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })} className={sel}>
                  {statuses.map((s) => <option key={s} value={s}>{t(`status.${s}` as TKey)}</option>)}
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute end-3.5 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]" />
              </div>
            </div>
            {floors && floors.length > 0 && (
              <RoomMultiSelect value={editForm.roomIds} onChange={(ids) => setEditForm({ ...editForm, roomIds: ids })} floors={floors} tr={tr} />
            )}
            {error && <p className="text-xs font-medium text-[var(--alert)]">{error}</p>}
            <div className="flex gap-3">
              <button type="submit" className="flex-1 rounded-xl bg-[var(--accent)] py-3 text-sm font-semibold text-white">{t("task.save")}</button>
              <button type="button" onClick={resetEdit} className="rounded-xl bg-[var(--border-subtle)] px-6 py-3 text-sm text-[var(--fg-secondary)]">{t("task.cancel")}</button>
            </div>
          </form>
        </Card>
      )}

      {/* Content */}
      {!tree ? (
        <p className="py-16 text-center text-sm text-[var(--fg-muted)]">{t("general.loading")}</p>
      ) : tree.length === 0 ? (
        <Card><p className="py-12 text-center text-sm text-[var(--fg-muted)]">{t("task.noTasks")}</p></Card>
      ) : viewMode === "list" ? (
        /* ── List View (Tree) ── */
        <NodeTree nodes={filteredTree || tree} projectId={project.id} vendors={vendors || []} categories={categories || []} onMutate={mutateAll} onEdit={startEdit} tr={tr} />
      ) : (
        /* ── Card Gallery View ── */
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredNodes.length === 0 ? (
            <div className="col-span-full py-12 text-center text-sm text-[var(--fg-muted)]">
              {t("task.noMatch")}
            </div>
          ) : filteredNodes.map((node: any) => (
            <TaskCard key={node.id} node={node} tr={tr} fmt={fmt} t={t} onEdit={() => startEdit(node)} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Task Card Component ──

function TaskCard({ node, tr, fmt, t, onEdit }: { node: any; tr: (s: string) => string; fmt: (n: number) => string; t: (key: TKey) => string; onEdit: () => void }) {
  const { lang } = useI18n();
  const cost = Number(node.expectedCost || 0);
  const paid = Number(node._paid || 0);
  const remaining = cost - paid;
  const pct = cost > 0 ? Math.round((paid / cost) * 100) : 0;

  return (
    <div
      onClick={onEdit}
      className="group relative cursor-pointer overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4 shadow-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_8px_30px_rgba(26,23,20,0.08)] hover:border-[var(--accent)]/30"
    >
      {/* Status accent line */}
      <div className={`absolute inset-x-0 top-0 h-1 ${
        node.status === "COMPLETED" ? "bg-[var(--success)]" :
        node.status === "IN_PROGRESS" ? "bg-[var(--accent)]" :
        node.status === "CANCELLED" ? "bg-[var(--alert)]" :
        "bg-[var(--border)]"
      }`} />

      {/* Header: name + status */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <h3 className="text-sm font-bold text-[var(--fg)] leading-tight">{tr(node.name)}</h3>
        <StatusBadge status={node.status} />
      </div>

      {/* Tags row: vendor + category */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {node.vendor?.name && (
          <span className="rounded-lg bg-[var(--border-subtle)] px-2 py-0.5 text-[10px] font-medium text-[var(--fg-secondary)]">
            {tr(node.vendor.name)}
          </span>
        )}
        {node.category?.name && (
          <span className="rounded-lg bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-bold uppercase text-[var(--accent)]">
            {tr(node.category.name)}
          </span>
        )}
        {node._count?.children > 0 && (
          <span className="rounded-lg bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600">
            {node._count.children} {t("task.subTasks")}
          </span>
        )}
        {node.rooms?.map((r: any) => (
          <span key={r.roomId} className="rounded-lg bg-[var(--border-subtle)] px-2 py-0.5 text-[10px] font-medium text-[var(--fg-muted)]">
            {r.room?.name || ""}
          </span>
        ))}
      </div>

      {/* Expected date */}
      {node.expectedDate && (
        <p className="mb-2 text-[10px] text-[var(--fg-muted)]">
          {new Date(node.expectedDate).toLocaleDateString(lang === "he" ? "he-IL" : "en-IL", { day: "numeric", month: "short", year: "numeric" })}
        </p>
      )}

      {/* Cost section */}
      {cost > 0 ? (
        <div className="space-y-2">
          {/* Progress bar */}
          <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--border-subtle)]">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${Math.min(pct, 100)}%`,
                background: pct >= 100 ? "var(--success)" : "linear-gradient(90deg, var(--accent), #C9A87C)",
              }}
            />
          </div>

          {/* Cost numbers */}
          <div className="flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1">
              <span className="font-bold text-[var(--success)]">{fmt(paid)}</span>
              <span className="text-[var(--fg-muted)]">/</span>
              <span className="font-semibold text-[var(--fg)]">{fmt(cost)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              {pct > 0 && (
                <span className="rounded-md bg-[var(--success-soft)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--success)]">{pct}%</span>
              )}
              {remaining > 0 && (
                <span className="font-semibold text-[var(--alert)]">{fmt(remaining)} {t("task.left")}</span>
              )}
            </div>
          </div>
        </div>
      ) : (
        <p className="text-xs italic text-[var(--fg-muted)]">{t("task.noCost")}</p>
      )}

      {/* Counts row */}
      {(node._count?.milestones > 0 || node._count?.issues > 0 || node._count?.receipts > 0) && (
        <div className="mt-3 flex gap-3 border-t border-[var(--border-subtle)] pt-2 text-[10px] text-[var(--fg-muted)]">
          {node._count?.milestones > 0 && <span>{node._count.milestones} {t("task.milestones").toLowerCase()}</span>}
          {node._count?.issues > 0 && <span className="text-[var(--alert)]">{node._count.issues} {t("nav.issues").toLowerCase()}</span>}
          {node._count?.receipts > 0 && <span>{node._count.receipts} {t("task.receipts").toLowerCase()}</span>}
        </div>
      )}
    </div>
  );
}
