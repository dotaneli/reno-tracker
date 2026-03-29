"use client";

import { useState, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import { StatusBadge } from "./StatusBadge";
import { ItemMilestones } from "./ItemMilestones";
import { CheckCircle2, CircleDollarSign, ChevronRight } from "lucide-react";
import { preload } from "swr";

interface TaskLineProps {
  node: any;
  milestones?: any[];
  tr: (text: string) => string;
  compact?: boolean;
  onMutate?: () => void;
}

export function TaskLine({ node, milestones, tr, compact = false, onMutate }: TaskLineProps) {
  const { t, lang } = useI18n();
  const [expanded, setExpanded] = useState(false);

  const fmt = (n: number) => new Intl.NumberFormat(lang === "he" ? "he-IL" : "en-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(n);

  const cost = Number(node.expectedCost || 0);
  const paid = milestones
    ? milestones.filter((m: any) => m.status === "PAID").reduce((s: number, m: any) => s + Number(m.amount), 0)
    : Number(node._paid || 0);
  const remaining = cost - paid;
  const pct = cost > 0 ? Math.round((paid / cost) * 100) : 0;
  const isDone = node.status === "COMPLETED";
  const isFullyPaid = cost > 0 && paid >= cost;

  // Prefetch milestones on hover so they're cached when expanded
  const prefetchMilestones = useCallback(() => {
    if (cost > 0 && !expanded) {
      const fetcher = (url: string) => fetch(url).then(r => r.json());
      preload(`/api/nodes/${node.id}/milestones`, fetcher);
    }
  }, [cost, expanded, node.id]);

  const handleMarkDone = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await fetch(`/api/nodes/${node.id}/done`, { method: "POST" });
    onMutate?.();
  };

  const handleMarkPaid = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await fetch(`/api/nodes/${node.id}/paid`, { method: "POST" });
    onMutate?.();
  };

  return (
    <div className="-mx-2">
      {/* Clickable row */}
      <div
        onClick={() => cost > 0 && setExpanded(!expanded)}
        onPointerEnter={prefetchMilestones}
        className={`flex flex-wrap items-center justify-between gap-x-2 gap-y-1 rounded-lg px-2 transition-colors ${cost > 0 ? "cursor-pointer" : ""} ${expanded ? "bg-[var(--accent-soft)]" : "hover:bg-[var(--warm-glow)]"} ${compact ? "py-1.5" : "py-2"}`}
      >
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          {cost > 0 && (
            <ChevronRight size={12} className={`shrink-0 text-[var(--fg-muted)] transition-transform ${expanded ? "rotate-90" : ""}`} />
          )}
          <span className={`font-semibold truncate max-w-[120px] sm:max-w-none ${isDone ? "text-[var(--fg-muted)] line-through" : "text-[var(--fg)]"} ${compact ? "text-xs" : "text-sm"}`}>{tr(node.name)}</span>
          {node.vendor?.name && <span className="hidden sm:inline text-xs text-[var(--fg-muted)]">{tr(node.vendor.name)}</span>}
          {(node.category?.name || node.nodeType) && (
            <span className="rounded bg-[var(--accent-soft)] px-1.5 py-px text-[8px] font-bold uppercase text-[var(--accent)]">
              {node.category?.name ? tr(node.category.name) : node.nodeType}
            </span>
          )}
          <StatusBadge status={node.status} />
        </div>

        <div className="flex items-center gap-1.5">
          {cost > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
              <span className="text-[var(--success)]">{fmt(paid)}</span>
              <span className="text-[var(--fg-muted)]">/</span>
              <span className="text-[var(--fg)]">{fmt(cost)}</span>
              {paid > 0 && <span className="rounded-md bg-[var(--success-soft)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--success)]">{pct}%</span>}
              {remaining > 0 && <span className="text-[var(--alert)]">{fmt(remaining)} {t("task.left")}</span>}
            </div>
          )}

          {/* Quick actions */}
          {onMutate && (
            <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
              {!isDone && (
                <button onClick={handleMarkDone} className="rounded-md p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-[var(--fg-muted)]/30 transition-all hover:bg-[var(--success-soft)] hover:text-[var(--success)]" title={t("task.markDone")}>
                  <CheckCircle2 size={13} />
                </button>
              )}
              {cost > 0 && !isFullyPaid && (
                <button onClick={handleMarkPaid} className="rounded-md p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-[var(--fg-muted)]/30 transition-all hover:bg-amber-50 hover:text-amber-600" title={t("task.markPaid")}>
                  <CircleDollarSign size={13} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Expanded: inline payments panel */}
      {expanded && cost > 0 && (
        <div className="ms-4 mb-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-2">
          <ItemMilestones itemId={node.id} expectedCost={cost} onMutate={onMutate} />
        </div>
      )}
    </div>
  );
}

/** Milestone line — shows a single payment with status */
export function MilestoneLine({ m, tr }: { m: any; tr: (text: string) => string }) {
  const { lang } = useI18n();
  const fmt = (n: number) => new Intl.NumberFormat(lang === "he" ? "he-IL" : "en-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(n);

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-1 text-xs rounded-lg px-2 -mx-2 transition-colors hover:bg-[var(--warm-glow)]">
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="font-medium text-[var(--fg)] truncate max-w-[80px] sm:max-w-none">{m.label}</span>
        <span className="hidden sm:inline text-[var(--fg-muted)]">{m.nodeName || m.node?.name || ""}</span>
        {m.dueDate && <span className="text-[var(--fg-muted)] shrink-0">{new Date(m.dueDate).toLocaleDateString(lang === "he" ? "he-IL" : "en-IL", { day: "numeric", month: "short" })}</span>}
      </div>
      <div className="flex items-center gap-1.5">
        <span className="font-semibold">{fmt(Number(m.amount))}</span>
        <StatusBadge status={m.status} />
      </div>
    </div>
  );
}
