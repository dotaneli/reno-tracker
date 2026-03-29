"use client";

import { useState, useCallback } from "react";
import { useI18n, type TKey } from "@/lib/i18n";
import { apiPost, apiPatch, apiDelete } from "@/hooks/useApi";
import { StatusBadge } from "./StatusBadge";
import { ItemMilestones } from "./ItemMilestones";
import { InlineCreateSelect } from "./InlineCreateSelect";
import {
  DndContext, PointerSensor, TouchSensor, useSensor, useSensors, useDroppable,
  DragOverlay, type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";
import { InlineNodeEdit } from "./InlineNodeEdit";
import { ChevronRight, DollarSign, Calendar, Pencil, X, Trash2, Plus, GripVertical, CornerLeftUp, CheckCircle2, CircleDollarSign } from "lucide-react";

const inp = "w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--fg)] placeholder-[var(--fg-muted)]/60 outline-none focus:border-[var(--accent)]";

interface NodeTreeProps {
  nodes: any[];
  depth?: number;
  projectId: string;
  vendors: any[];
  categories: any[];
  floors?: any[];
  allNodes?: any[];
  editNodeId?: string | null;
  onMutate: () => void;
  onEdit: (node: any) => void;
  onEditDone?: () => void;
  onEditCancel?: () => void;
  tr: (text: string) => string;
  parentVendor?: string | null;
  parentCost?: number | null;
  allProjectMilestones?: any[];
}

export function NodeTree({ nodes, depth = 0, projectId, vendors, categories, floors, allNodes, editNodeId, onMutate, onEdit, onEditDone, onEditCancel, tr, parentVendor, parentCost, allProjectMilestones }: NodeTreeProps) {
  const { t, lang } = useI18n();
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 300, tolerance: 10 } }),
  );

  const fmt = (n: number | null) =>
    n != null ? new Intl.NumberFormat(lang === "he" ? "he-IL" : "en-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(n) : "";

  const handleDragStart = (e: DragStartEvent) => setActiveId(e.active.id as string);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const targetId = over.id as string;
    const activeNode = findNode(nodes, active.id as string);
    if (targetId === "root-drop") {
      await apiPatch(`/api/nodes/${active.id}`, { parentId: null });
    } else {
      if (activeNode && isDescendant(activeNode, targetId)) return;
      await apiPatch(`/api/nodes/${active.id}`, { parentId: targetId });
    }
    onMutate();
  }, [nodes, onMutate]);

  const activeNode = activeId ? findNode(nodes, activeId) : null;

  if (depth === 0) {
    return (
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <RootDropZone active={!!activeId} label={t("task.moveToRoot")} />
        <div className="space-y-2">
          {nodes.map((node) => (
            <DraggableNode key={node.id} node={node} depth={0} projectId={projectId} vendors={vendors} categories={categories} floors={floors} allNodes={allNodes} editNodeId={editNodeId} onMutate={onMutate} onEdit={onEdit} onEditDone={onEditDone} onEditCancel={onEditCancel} tr={tr} fmt={fmt} parentVendor={parentVendor} parentCost={parentCost} allProjectMilestones={allProjectMilestones} />
          ))}
        </div>
        <DragOverlay>
          {activeNode && (
            <div className="rounded-xl border-2 border-[var(--accent)] bg-[var(--bg-elevated)] p-3 opacity-90 shadow-xl">
              <p className="text-sm font-semibold text-[var(--fg)]">{tr(activeNode.name)}</p>
            </div>
          )}
        </DragOverlay>
      </DndContext>
    );
  }

  return (
    <div className="ms-3 md:ms-5 border-s border-[var(--border-subtle)] ps-2 md:ps-3 mt-1 space-y-2">
      {nodes.map((node) => (
        <DraggableNode key={node.id} node={node} depth={depth} projectId={projectId} vendors={vendors} categories={categories} floors={floors} allNodes={allNodes} editNodeId={editNodeId} onMutate={onMutate} onEdit={onEdit} onEditDone={onEditDone} onEditCancel={onEditCancel} tr={tr} fmt={fmt} parentVendor={parentVendor} parentCost={parentCost} allProjectMilestones={allProjectMilestones} />
      ))}
    </div>
  );
}

function RootDropZone({ active, label }: { active: boolean; label: string }) {
  const { isOver, setNodeRef } = useDroppable({ id: "root-drop" });
  if (!active) return null;
  return (
    <div ref={setNodeRef} className={`mb-3 flex items-center justify-center gap-2 rounded-xl border-2 border-dashed p-3 text-xs font-semibold transition-all ${isOver ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]" : "border-[var(--border)] text-[var(--fg-muted)]"}`}>
      <CornerLeftUp size={14} />{label}
    </div>
  );
}

function DraggableNode(props: Omit<NodeTreeProps, "nodes"> & { node: any; fmt: (n: number | null) => string }) {
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({ id: props.node.id });
  const { isOver, setNodeRef: setDropRef } = useDroppable({ id: props.node.id });
  return (
    <div ref={(el) => { setDragRef(el); setDropRef(el); }} {...attributes} style={{ opacity: isDragging ? 0.3 : 1 }}>
      <NodeRow {...props} dragListeners={listeners} isOver={isOver} />
    </div>
  );
}

function NodeRow({ node, depth = 0, projectId, vendors, categories, floors, allNodes, editNodeId, onMutate, onEdit, onEditDone, onEditCancel, tr, fmt, parentVendor, parentCost, allProjectMilestones, dragListeners, isOver }: Omit<NodeTreeProps, "nodes"> & { node: any; fmt: (n: number | null) => string; dragListeners?: any; isOver?: boolean }) {
  const { t, lang } = useI18n();
  const [expanded, setExpanded] = useState(true);
  const [showMilestones, setShowMilestones] = useState(false);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", categoryId: "", vendorId: "", expectedCost: "", expectedDate: "" });

  const children = node.children || [];
  const hasChildren = children.length > 0;
  const hasCost = node.expectedCost != null;
  const ownCost = Number(node.expectedCost || 0);
  const aggregateCost = hasChildren ? sumCosts(node) : 0;
  const nodeVendorName = node.vendor ? tr(node.vendor.name) : null;
  const inheritedVendor = nodeVendorName || parentVendor;
  const isDone = node.status === "COMPLETED";

  const handleMarkDone = async () => { await fetch(`/api/nodes/${node.id}/done`, { method: "POST" }); onMutate(); };
  const handleMarkPaid = async () => { await fetch(`/api/nodes/${node.id}/paid`, { method: "POST" }); onMutate(); };
  const handleDelete = async () => { if (!confirm(t("task.deleteConfirm").replace("{name}", node.name))) return; await apiDelete(`/api/nodes/${node.id}`); onMutate(); };
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const data: any = { name: form.name, projectId, parentId: node.id };
    if (form.categoryId) data.categoryId = form.categoryId;
    if (form.vendorId) data.vendorId = form.vendorId;
    if (form.expectedCost) data.expectedCost = Number(form.expectedCost);
    if (form.expectedDate) data.expectedDate = form.expectedDate;
    await apiPost("/api/nodes", data);
    setForm({ name: "", categoryId: "", vendorId: "", expectedCost: "", expectedDate: "" });
    setAdding(false); setExpanded(true); onMutate();
  };

  // Cost aggregation
  const ownPaid = Number(node._paid || 0);
  const childCost = hasChildren ? sumCosts(node) : 0;
  const childPaid = hasChildren ? sumPaid(node) : 0;
  const totalCost = ownCost + childCost;
  const totalPaid = ownPaid + childPaid;
  const totalRemaining = totalCost - totalPaid;
  const pct = totalCost > 0 ? Math.round((totalPaid / totalCost) * 100) : 0;

  return (
    <div>
      <div className={`group rounded-xl border bg-[var(--bg-elevated)] transition-all duration-200 hover:scale-[1.01] hover:shadow-[0_4px_16px_rgba(26,23,20,0.08)] ${
        isOver ? "border-[var(--accent)] bg-[var(--accent-soft)] scale-[1.02]" : "border-[var(--border-subtle)] hover:border-[var(--accent)]/20"
      } ${depth === 0 ? "shadow-[0_1px_3px_rgba(26,23,20,0.04)]" : ""}`}>

        {/* Main row */}
        <div className="p-2 md:p-3">
          <div className="flex items-start gap-1">
            {/* Drag + Expand — compact */}
            <div className="flex shrink-0 items-center">
              <button {...dragListeners} className="cursor-grab rounded-md p-1.5 text-[var(--fg-muted)]/30 hover:text-[var(--fg)] active:cursor-grabbing" style={{ touchAction: "none" }}>
                <GripVertical size={14} />
              </button>
              <button onClick={() => setExpanded(!expanded)} className="rounded-md p-1 text-[var(--fg-muted)]/40 hover:text-[var(--fg-muted)]">
                <ChevronRight size={14} className={`transition-transform ${expanded && hasChildren ? "rotate-90" : ""} ${!hasChildren ? "opacity-0" : ""}`} />
              </button>
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1">
              {/* Name + badges */}
              <div className="flex flex-wrap items-center gap-1.5">
                <p className={`font-semibold ${depth === 0 ? "text-sm" : "text-xs"} ${isDone ? "text-[var(--fg-muted)] line-through" : "text-[var(--fg)]"}`}>{tr(node.name)}</p>
              {(node.category?.name || node.nodeType) && (
                <span className="rounded bg-[var(--accent-soft)] px-1.5 py-px text-[8px] font-bold uppercase tracking-wider text-[var(--accent)]">
                  {node.category?.name ? tr(node.category.name) : t(`type.${node.nodeType}` as TKey)}
                </span>
              )}
              <StatusBadge status={node.status} />
            </div>

            {/* Info line — wraps naturally */}
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
              {nodeVendorName && <span className="font-semibold text-[var(--fg-secondary)]">{nodeVendorName}</span>}
              {!nodeVendorName && parentVendor && <span className="italic text-[var(--fg-muted)]">{parentVendor}</span>}

              {totalCost > 0 && (
                <span className="flex flex-wrap items-center gap-1 font-semibold">
                  <span className="text-[var(--success)]">{fmt(totalPaid)}</span>
                  <span className="text-[var(--fg-muted)]">/</span>
                  <span className="text-[var(--fg)]">{fmt(totalCost)}</span>
                  {totalPaid > 0 && <span className="rounded-md bg-[var(--success-soft)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--success)]">{pct}%</span>}
                  {totalRemaining > 0 && <span className="font-medium text-[var(--alert)]">{fmt(totalRemaining)} {t("task.left")}</span>}
                </span>
              )}

              {node.expectedDate && (
                <span className="flex items-center gap-0.5 text-[var(--fg-muted)]">
                  <Calendar size={10} />{new Date(node.expectedDate).toLocaleDateString(lang === "he" ? "he-IL" : "en-IL", { day: "numeric", month: "short" })}
                </span>
              )}
            </div>
            </div>
          </div>

          {/* Actions — compact row */}
          <div className="flex flex-wrap items-center gap-1 mt-1.5 ms-7">
            {!isDone && (
              <button onClick={handleMarkDone} className="rounded-lg bg-[var(--success-soft)] p-1.5 text-[var(--success)] hover:bg-[var(--success)] hover:text-white" title={t("task.markDone")}>
                <CheckCircle2 size={14} />
              </button>
            )}
            {hasCost && totalPaid < totalCost && (
              <button onClick={handleMarkPaid} className="rounded-lg bg-amber-50 p-1.5 text-amber-600 hover:bg-amber-500 hover:text-white" title={t("task.markPaid")}>
                <CircleDollarSign size={14} />
              </button>
            )}
            {hasCost && (
              <button onClick={() => setShowMilestones(!showMilestones)} className={`rounded-lg px-2 py-1.5 text-[10px] font-bold ${showMilestones ? "bg-[var(--accent)] text-white" : "bg-[var(--fg)]/5 text-[var(--fg)] hover:bg-[var(--accent)] hover:text-white"}`}>
                {t("task.milestones")}
              </button>
            )}
            <button onClick={() => { setAdding(!adding); setExpanded(true); }} className="rounded-lg bg-[var(--fg)]/5 p-1.5 text-[var(--fg)] hover:bg-[var(--fg)] hover:text-[var(--bg-elevated)]"><Plus size={14} /></button>
            {editNodeId === node.id ? (
              <button onClick={() => onEditCancel?.()} className="rounded-lg bg-[var(--accent)] p-1.5 text-white hover:bg-[var(--alert)]" title={t("task.cancel")}><X size={13} /></button>
            ) : (
              <button onClick={() => onEdit(node)} className="rounded-lg bg-[var(--fg)]/5 p-1.5 text-[var(--fg)] hover:bg-[var(--accent)] hover:text-white" title={t("crud.edit")}><Pencil size={13} /></button>
            )}
            <button onClick={handleDelete} className="rounded-lg bg-[var(--fg)]/5 p-1.5 text-[var(--fg)] hover:bg-[var(--alert)] hover:text-white"><Trash2 size={13} /></button>
          </div>
        </div>
      </div>

      {/* Inline edit */}
      {editNodeId === node.id && onEditDone && onEditCancel && (
        <div className="ms-3 md:ms-7 mt-1 rounded-xl border border-[var(--accent)]/30 bg-[var(--bg-elevated)] p-3 shadow-md">
          <InlineNodeEdit node={node} projectId={projectId} allNodes={allNodes || []} vendors={vendors} categories={categories} floors={floors} tr={tr} onDone={onEditDone} onCancel={onEditCancel} />
        </div>
      )}

      {/* Milestones */}
      {showMilestones && hasCost && (
        <div className="ms-3 md:ms-7 mt-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3">
          <ItemMilestones itemId={node.id} expectedCost={ownCost} onMutate={onMutate} prefetchedMilestones={node.milestones || allProjectMilestones?.filter((m: any) => m.nodeId === node.id)} />
        </div>
      )}

      {/* Add task form */}
      {adding && (
        <div className="ms-3 md:ms-7 mt-1 rounded-lg border border-dashed border-[var(--accent)]/30 bg-[var(--bg-elevated)] p-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[var(--accent)]">{t("task.addTask")} → {tr(node.name)}</p>
          <form onSubmit={handleAdd} className="space-y-2">
            <input type="text" placeholder={t("task.name")} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className={inp} />
            <div className="grid grid-cols-2 gap-2">
              <input type="number" placeholder="₪" value={form.expectedCost} onChange={(e) => setForm({ ...form, expectedCost: e.target.value })} className={inp} />
              <input type="date" value={form.expectedDate} onChange={(e) => setForm({ ...form, expectedDate: e.target.value })} className={inp} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <InlineCreateSelect value={form.vendorId} onChange={(v) => setForm({ ...form, vendorId: v })} options={vendors.map((v: any) => ({ id: v.id, name: v.name }))} placeholder={t("task.selectVendor")} onCreateLabel={t("vendor.name")} tr={tr} onCreate={async (name) => { const res = await apiPost("/api/vendors", { name, projectId }); onMutate(); return res.id; }} />
              <InlineCreateSelect value={form.categoryId} onChange={(c) => setForm({ ...form, categoryId: c })} options={categories.map((c: any) => ({ id: c.id, name: c.name }))} placeholder={t("cat.selectCategory")} onCreateLabel={t("cat.name")} tr={tr} onCreate={async (name) => { const res = await apiPost("/api/categories", { name, projectId }); onMutate(); return res.id; }} />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="flex-1 rounded-lg bg-[var(--accent)] py-2 text-xs font-semibold text-white">{t("task.save")}</button>
              <button type="button" onClick={() => setAdding(false)} className="rounded-lg bg-[var(--border-subtle)] px-4 py-2 text-xs text-[var(--fg-secondary)]">{t("task.cancel")}</button>
            </div>
          </form>
        </div>
      )}

      {/* Children */}
      {expanded && hasChildren && (
        <NodeTree nodes={children} depth={(depth ?? 0) + 1} projectId={projectId} vendors={vendors} categories={categories} floors={floors} allNodes={allNodes} editNodeId={editNodeId} onMutate={onMutate} onEdit={onEdit} onEditDone={onEditDone} onEditCancel={onEditCancel} tr={tr} parentVendor={inheritedVendor} parentCost={hasCost ? ownCost : parentCost} />
      )}
    </div>
  );
}

function findNode(nodes: any[], id: string): any | null {
  for (const n of nodes) { if (n.id === id) return n; const f = findNode(n.children || [], id); if (f) return f; } return null;
}
function isDescendant(node: any, targetId: string): boolean {
  if (node.id === targetId) return true;
  for (const c of node.children || []) { if (isDescendant(c, targetId)) return true; } return false;
}
function sumCosts(node: any): number {
  let t = 0; for (const c of node.children || []) t += Number(c.expectedCost || 0) + sumCosts(c); return t;
}
function sumPaid(node: any): number {
  let t = Number(node._paid || 0); for (const c of node.children || []) t += sumPaid(c); return t;
}
