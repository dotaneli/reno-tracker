"use client";

import { useI18n } from "@/lib/i18n";
import { StatusBadge } from "./StatusBadge";

/**
 * Reusable task summary line — used everywhere a task/node is referenced.
 * Shows: name, vendor, category, paid/total/remaining, status, date.
 */
interface TaskLineProps {
  node: any;
  milestones?: any[];  // milestones for this specific node
  tr: (text: string) => string;
  compact?: boolean;   // less detail for nested lists
}

export function TaskLine({ node, milestones, tr, compact = false }: TaskLineProps) {
  const { t, lang } = useI18n();

  const fmt = (n: number) => new Intl.NumberFormat(lang === "he" ? "he-IL" : "en-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(n);

  const cost = Number(node.expectedCost || 0);
  const paid = milestones
    ? milestones.filter((m: any) => m.status === "PAID").reduce((s: number, m: any) => s + Number(m.amount), 0)
    : Number(node._paid || 0);
  const remaining = cost - paid;
  const pct = cost > 0 ? Math.round((paid / cost) * 100) : 0;

  return (
    <div className={`flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-lg px-2 -mx-2 transition-colors hover:bg-[var(--warm-glow)] ${compact ? "py-1.5" : "py-2"}`}>
      <div className="flex flex-wrap items-center gap-1.5 min-w-0">
        <span className={`font-semibold text-[var(--fg)] ${compact ? "text-xs" : "text-sm"}`}>{tr(node.name)}</span>
        {node.vendor?.name && <span className="text-xs text-[var(--fg-muted)]">{tr(node.vendor.name)}</span>}
        {(node.category?.name || node.nodeType) && (
          <span className="rounded bg-[var(--accent-soft)] px-1.5 py-px text-[8px] font-bold uppercase text-[var(--accent)]">
            {node.category?.name ? tr(node.category.name) : node.nodeType}
          </span>
        )}
        <StatusBadge status={node.status} />
      </div>

      {cost > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
          <span className="text-[var(--success)]">{fmt(paid)}</span>
          <span className="text-[var(--fg-muted)]">/</span>
          <span className="text-[var(--fg)]">{fmt(cost)}</span>
          {paid > 0 && <span className="rounded-md bg-[var(--success-soft)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--success)]">{pct}%</span>}
          {remaining > 0 && <span className="text-[var(--alert)]">{fmt(remaining)} {t("task.left")}</span>}
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
      <div className="flex items-center gap-1.5">
        <span className="font-medium text-[var(--fg)]">{m.label}</span>
        <span className="text-[var(--fg-muted)]">{m.nodeName || m.node?.name || ""}</span>
        {m.dueDate && <span className="text-[var(--fg-muted)]">{new Date(m.dueDate).toLocaleDateString(lang === "he" ? "he-IL" : "en-IL", { day: "numeric", month: "short" })}</span>}
      </div>
      <div className="flex items-center gap-1.5">
        <span className="font-semibold">{fmt(Number(m.amount))}</span>
        <StatusBadge status={m.status} />
      </div>
    </div>
  );
}
