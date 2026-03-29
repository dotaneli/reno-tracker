"use client";

import { useState, useMemo } from "react";
import { useProject } from "@/hooks/useProject";
import { useI18n, type TKey } from "@/lib/i18n";
import { useApi, apiPost, apiPatch, apiDelete } from "@/hooks/useApi";
import { useTranslate } from "@/hooks/useTranslate";
import { useFinancials } from "@/hooks/useFinancials";
import { Card } from "@/components/Card";
import { NodeTree } from "@/components/NodeTree";
import { InlineCreateSelect } from "@/components/InlineCreateSelect";
import { RoomMultiSelect } from "@/components/RoomMultiSelect";
import { StatusBadge } from "@/components/StatusBadge";
import { ItemMilestones } from "@/components/ItemMilestones";
import { InlineNodeEdit } from "@/components/InlineNodeEdit";
import { Plus, X, ChevronDown, Search, List, LayoutGrid, ArrowUpDown, Wallet, CheckCircle2, CircleDollarSign, Pencil, Trash2 } from "lucide-react";
import { mutate } from "swr";

const input = "w-full rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--fg)] placeholder-[var(--fg-muted)]/60 outline-none transition-all focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/10";
const sel = "w-full appearance-none rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3 pe-9 text-sm text-[var(--fg)] outline-none transition-all focus:border-[var(--accent)]";

const statuses = ["NOT_STARTED","IN_PROGRESS","COMPLETED","ON_HOLD","PENDING","ORDERED","DELIVERED","INSTALLED","CANCELLED"] as const;

type SortKey = "default" | "price" | "category" | "vendor" | "status" | "payment";
type ViewMode = "list" | "cards";

export default function TasksPage() {
  const { t, lang } = useI18n();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editNodeId, setEditNodeId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("default");
  const [unpaidOnly, setUnpaidOnly] = useState(false);

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

  const mutateAll = () => { mutate(`/api/nodes?projectId=${project?.id}&tree=true`); mutate(`/api/nodes?projectId=${project?.id}`); mutate(`/api/vendors?projectId=${project?.id}`); mutate(`/api/categories?projectId=${project?.id}`); mutate(`/api/projects/${project?.id}/milestones`); mutate("/api/projects"); };

  const fmt = (n: number) => new Intl.NumberFormat(lang === "he" ? "he-IL" : "en-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(n);

  // ── Search, Filter & Sort (for card view — operates on flat list) ──
  const filteredNodes = useMemo(() => {
    let nodes = allNodesFlat || [];
    // Unpaid filter
    if (unpaidOnly) {
      nodes = nodes.filter((n: any) => {
        const cost = Number(n.expectedCost || 0);
        const paid = Number(n._paid || 0);
        return cost > 0 && paid < cost;
      });
    }
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

  // Filter tree for search + unpaid (in list view)
  const filteredTree = useMemo(() => {
    if (!tree) return tree;
    const hasSearch = searchQuery.trim();
    const q = hasSearch ? searchQuery.toLowerCase() : "";

    function isUnpaid(node: any): boolean {
      const cost = Number(node.expectedCost || 0);
      const paid = Number(node._paid || 0);
      if (cost > 0 && paid < cost) return true;
      return node.children?.some((c: any) => isUnpaid(c)) || false;
    }

    function matchesSearch(node: any): boolean {
      if (node.name?.toLowerCase().includes(q) || tr(node.name)?.toLowerCase().includes(q) ||
          node.vendor?.name?.toLowerCase().includes(q) || node.category?.name?.toLowerCase().includes(q))
        return true;
      return node.children?.some((c: any) => matchesSearch(c)) || false;
    }

    function matchesFilters(node: any): boolean {
      if (unpaidOnly && !isUnpaid(node)) return false;
      if (hasSearch && !matchesSearch(node)) return false;
      return true;
    }

    if (!hasSearch && !unpaidOnly) return tree;

    function filterNode(node: any): any | null {
      if (matchesFilters(node)) {
        return { ...node, children: node.children?.map(filterNode).filter(Boolean) || [] };
      }
      return null;
    }
    return tree.map(filterNode).filter(Boolean);
  }, [tree, searchQuery, unpaidOnly, tr]);

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

  const startEdit = (node: any) => { setEditNodeId(node.id); setShowAddForm(false); };
  const resetEdit = () => { setEditNodeId(null); };

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--fg)]">{t("task.title")}</h1>
          <p className="mt-0.5 text-sm text-[var(--fg-muted)]">{rootCount} {t("dash.groups").toLowerCase()} · {totalCount} {t("dash.tasks").toLowerCase()}</p>
        </div>
        <button onClick={() => { setShowAddForm(!showAddForm); setEditNodeId(null); }}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${showAddForm ? "bg-[var(--border-subtle)] text-[var(--fg-secondary)]" : "bg-[var(--fg)] text-[var(--bg-elevated)] shadow-lg shadow-[var(--fg)]/10"}`}>
          {showAddForm ? <X size={16} /> : <Plus size={16} />}
          {showAddForm ? t("task.cancel") : t("task.addTask")}
        </button>
      </div>

      {/* Budget Bar */}
      {!fin.loading && (
        <div className="grid grid-cols-2 gap-x-3 gap-y-2 rounded-2xl bg-[var(--fg)] px-4 py-3 md:px-6 md:py-4 text-[var(--bg-elevated)] sm:flex sm:flex-wrap sm:items-center sm:gap-4">
          <div className="flex items-center gap-2 col-span-2 sm:col-span-1">
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
          <div className="col-span-2 sm:col-span-1 sm:ms-auto flex items-center gap-1.5 text-xs">
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

        {/* Unpaid Filter */}
        <button
          onClick={() => setUnpaidOnly(!unpaidOnly)}
          className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-all ${unpaidOnly ? "border-[var(--alert)]/40 bg-[var(--alert-soft)] text-[var(--alert)]" : "border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--fg-muted)] hover:text-[var(--fg)]"}`}
        >
          <CircleDollarSign size={14} />
          {t("costs.unpaidOnly")}
        </button>

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
            {error && !editNodeId && <p className="text-xs font-medium text-[var(--alert)]">{error}</p>}
            <button type="submit" className="w-full rounded-xl bg-[var(--accent)] py-3 text-sm font-semibold text-white shadow-md shadow-[var(--accent)]/20">{t("task.save")}</button>
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
        <NodeTree nodes={filteredTree || tree} projectId={project.id} vendors={vendors || []} categories={categories || []} floors={floors || []} allNodes={allNodesFlat || []} editNodeId={editNodeId} onMutate={mutateAll} onEdit={startEdit} onEditDone={() => { resetEdit(); mutateAll(); }} onEditCancel={resetEdit} tr={tr} />
      ) : (
        /* ── Card Gallery View ── */
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredNodes.length === 0 ? (
            <div className="col-span-full py-12 text-center text-sm text-[var(--fg-muted)]">
              {t("task.noMatch")}
            </div>
          ) : filteredNodes.map((node: any) => {
            const parentNode = node.parentId ? allNodesFlat?.find((n: any) => n.id === node.parentId) : null;
            return <TaskCard key={node.id} node={node} parentName={parentNode ? tr(parentNode.name) : null} tr={tr} fmt={fmt} t={t} isEditing={editNodeId === node.id} onEdit={() => startEdit(node)} onEditDone={() => { resetEdit(); mutateAll(); }} onEditCancel={resetEdit} onMutate={mutateAll} projectId={project.id} allNodes={allNodesFlat || []} vendors={vendors || []} categories={categories || []} floors={floors || []} />;
          })}
        </div>
      )}
    </div>
  );
}

// ── Task Card Component (full functionality) ──

function TaskCard({ node, parentName, tr, fmt, t, isEditing, onEdit, onEditDone, onEditCancel, onMutate, projectId, allNodes, vendors, categories, floors }: {
  node: any; parentName: string | null; tr: (s: string) => string; fmt: (n: number) => string;
  t: (key: TKey) => string; isEditing: boolean; onEdit: () => void; onEditDone: () => void; onEditCancel: () => void;
  onMutate: () => void; projectId: string; allNodes: any[]; vendors: any[]; categories: any[]; floors: any[];
}) {
  const { lang } = useI18n();
  const [expanded, setExpanded] = useState(false);

  // Roll up costs from children (same as NodeTree's sumCosts/sumPaid)
  const ownCost = Number(node.expectedCost || 0);
  const childCost = (node.children || []).reduce((s: number, c: any) => s + (Number(c.expectedCost) || 0), 0);
  const cost = ownCost + childCost;
  const ownPaid = Number(node._paid || 0);
  const childPaid = (node.children || []).reduce((s: number, c: any) => s + (Number(c._paid) || 0), 0);
  const paid = ownPaid + childPaid;
  const remaining = cost - paid;
  const pct = cost > 0 ? Math.round((paid / cost) * 100) : 0;
  const isDone = node.status === "COMPLETED";

  const handleMarkDone = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await fetch(`/api/nodes/${node.id}/done`, { method: "POST" });
    onMutate();
  };

  const handleMarkPaid = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await fetch(`/api/nodes/${node.id}/paid`, { method: "POST" });
    onMutate();
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(t("task.deleteConfirm").replace("{name}", node.name))) return;
    await apiDelete(`/api/nodes/${node.id}`);
    onMutate();
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] shadow-sm transition-all duration-200 hover:shadow-[0_8px_30px_rgba(26,23,20,0.08)] hover:border-[var(--accent)]/30">
      {/* Status accent line */}
      <div className={`h-1 ${
        node.status === "COMPLETED" ? "bg-[var(--success)]" :
        node.status === "IN_PROGRESS" ? "bg-[var(--accent)]" :
        node.status === "CANCELLED" ? "bg-[var(--alert)]" :
        "bg-[var(--border)]"
      }`} />

      {/* Clickable header area */}
      <div className="cursor-pointer p-4" onClick={() => setExpanded(!expanded)}>
        {/* Parent breadcrumb */}
        {parentName && (
          <p className="mb-1 text-[10px] text-[var(--fg-muted)]">↳ {parentName}</p>
        )}

        {/* Header: name + status + actions */}
        <div className="mb-2 flex items-start justify-between gap-2">
          <h3 className={`text-sm font-bold leading-tight ${isDone ? "text-[var(--fg-muted)] line-through" : "text-[var(--fg)]"}`}>{tr(node.name)}</h3>
          <div className="flex shrink-0 items-center gap-1">
            <StatusBadge status={node.status} />
          </div>
        </div>

        {/* Tags */}
        <div className="mb-2 flex flex-wrap gap-1.5">
          {node.vendor?.name && (
            <span className="rounded-lg bg-[var(--border-subtle)] px-2 py-0.5 text-[10px] font-medium text-[var(--fg-secondary)]">{tr(node.vendor.name)}</span>
          )}
          {node.category?.name && (
            <span className="rounded-lg bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-bold uppercase text-[var(--accent)]">{tr(node.category.name)}</span>
          )}
          {node._count?.children > 0 && (
            <span className="rounded-lg bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600">{node._count.children} {t("task.subTasks")}</span>
          )}
          {node.rooms?.map((r: any) => (
            <span key={r.roomId} className="rounded-lg bg-[var(--border-subtle)] px-2 py-0.5 text-[10px] font-medium text-[var(--fg-muted)]">{r.room?.name || ""}</span>
          ))}
        </div>

        {/* Date */}
        {node.expectedDate && (
          <p className="mb-2 text-[10px] text-[var(--fg-muted)]">
            {new Date(node.expectedDate).toLocaleDateString(lang === "he" ? "he-IL" : "en-IL", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        )}

        {/* Cost + progress */}
        {cost > 0 ? (
          <div className="space-y-1.5">
            <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--border-subtle)]">
              <div className="h-full rounded-full transition-all duration-700 ease-out"
                style={{ width: `${Math.min(pct, 100)}%`, background: pct >= 100 ? "var(--success)" : "linear-gradient(90deg, var(--accent), #C9A87C)" }} />
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1">
                <span className="font-bold text-[var(--success)]">{fmt(paid)}</span>
                <span className="text-[var(--fg-muted)]">/</span>
                <span className="font-semibold text-[var(--fg)]">{fmt(cost)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                {pct > 0 && <span className="rounded-md bg-[var(--success-soft)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--success)]">{pct}%</span>}
                {remaining > 0 && <span className="font-semibold text-[var(--alert)]">{fmt(remaining)} {t("task.left")}</span>}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-xs italic text-[var(--fg-muted)]">{t("task.noCost")}</p>
        )}

        {/* Counts + expand hint */}
        <div className="mt-2 flex items-center justify-between">
          <div className="flex gap-3 text-[10px] text-[var(--fg-muted)]">
            {node._count?.milestones > 0 && <span>{node._count.milestones} {t("task.milestones").toLowerCase()}</span>}
            {node._count?.issues > 0 && <span className="text-[var(--alert)]">{node._count.issues} {t("nav.issues").toLowerCase()}</span>}
            {node._count?.receipts > 0 && <span>{node._count.receipts} {t("task.receipts").toLowerCase()}</span>}
          </div>
          <ChevronDown size={14} className={`text-[var(--fg-muted)] transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
        </div>
      </div>

      {/* ── Expanded detail panel ── */}
      {expanded && (
        <div className="border-t border-[var(--border-subtle)] bg-[var(--bg)] px-4 pb-4">
          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 py-3">
            {!isDone && (
              <button onClick={handleMarkDone} className="flex items-center gap-1.5 rounded-lg bg-[var(--success-soft)] px-3 py-2 text-xs font-semibold text-[var(--success)] transition-all hover:bg-[var(--success)] hover:text-white">
                <CheckCircle2 size={14} /> {t("task.markDone")}
              </button>
            )}
            {cost > 0 && paid < cost && (
              <button onClick={handleMarkPaid} className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-600 transition-all hover:bg-amber-500 hover:text-white">
                <CircleDollarSign size={14} /> {t("task.markPaid")}
              </button>
            )}
            <button onClick={(e) => { e.stopPropagation(); if (isEditing) onEditCancel(); else onEdit(); }} className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${isEditing ? "bg-[var(--accent)] text-white hover:bg-[var(--alert)]" : "bg-[var(--fg)]/5 text-[var(--fg)] hover:bg-[var(--accent)] hover:text-white"}`}>
              {isEditing ? <X size={13} /> : <Pencil size={13} />}
              {isEditing ? t("task.cancel") : t("crud.edit")}
            </button>
            <button onClick={handleDelete} className="flex items-center gap-1.5 rounded-lg bg-[var(--fg)]/5 px-3 py-2 text-xs font-semibold text-[var(--fg)] transition-all hover:bg-[var(--alert)] hover:text-white">
              <Trash2 size={13} /> {t("crud.delete")}
            </button>
          </div>

          {/* Inline edit form */}
          {isEditing && (
            <div className="rounded-xl border border-[var(--accent)]/30 bg-[var(--bg-elevated)] p-3 shadow-inner">
              <InlineNodeEdit node={node} projectId={projectId} allNodes={allNodes} vendors={vendors} categories={categories} floors={floors} tr={tr} onDone={onEditDone} onCancel={onEditCancel} />
            </div>
          )}

          {/* Payment milestones */}
          {cost > 0 && !isEditing && (
            <ItemMilestones itemId={node.id} expectedCost={cost} onMutate={onMutate} />
          )}

          {/* Children preview */}
          {node._count?.children > 0 && node.children?.length > 0 && (
            <div className="mt-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[var(--fg-muted)]">{t("task.subTasks")}</p>
              <div className="space-y-1">
                {node.children.map((child: any) => (
                  <div key={child.id} className="flex items-center justify-between rounded-lg px-2 py-1.5 text-xs hover:bg-[var(--warm-glow)]">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-[var(--fg)]">{tr(child.name)}</span>
                      <StatusBadge status={child.status} />
                    </div>
                    {child.expectedCost && <span className="font-semibold text-[var(--fg-muted)]">{fmt(Number(child.expectedCost))}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
