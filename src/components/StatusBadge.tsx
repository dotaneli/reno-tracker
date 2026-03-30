"use client";

import { useI18n, type TKey } from "@/lib/i18n";

const statusStyles: Record<string, string> = {
  NOT_STARTED: "bg-[var(--fg-muted)]/8 text-[var(--fg-muted)] ring-[var(--fg-muted)]/10",
  PENDING: "bg-[var(--fg-muted)]/8 text-[var(--fg-muted)] ring-[var(--fg-muted)]/10",
  IN_PROGRESS: "bg-[var(--accent-soft)] text-[var(--accent)] ring-[var(--accent)]/15",
  PROCESSING: "bg-[var(--accent-soft)] text-[var(--accent)] ring-[var(--accent)]/15",
  ORDERED: "bg-amber-50 text-amber-700 ring-amber-200/50",
  DELIVERED: "bg-[var(--success-soft)] text-[var(--success)] ring-[var(--success)]/15",
  INSTALLED: "bg-[var(--success-soft)] text-[var(--success)] ring-[var(--success)]/15",
  COMPLETED: "bg-[var(--success-soft)] text-[var(--success)] ring-[var(--success)]/15",
  RESOLVED: "bg-[var(--success-soft)] text-[var(--success)] ring-[var(--success)]/15",
  PAID: "bg-[var(--success-soft)] text-[var(--success)] ring-[var(--success)]/15",
  CANCELLED: "bg-red-50 text-red-500 ring-red-100",
  ON_HOLD: "bg-orange-50 text-orange-600 ring-orange-100",
  OPEN: "bg-[var(--alert-soft)] text-[var(--alert)] ring-[var(--alert)]/15",
  FAILED: "bg-red-50 text-red-500 ring-red-100",
  DUE: "bg-amber-50 text-amber-700 ring-amber-200/50",
  OVERDUE: "bg-[var(--alert-soft)] text-[var(--alert)] ring-[var(--alert)]/15",
};

const dotColors: Record<string, string> = {
  NOT_STARTED: "bg-[var(--fg-muted)]",
  PENDING: "bg-[var(--fg-muted)]",
  IN_PROGRESS: "bg-[var(--accent)]",
  PROCESSING: "bg-[var(--accent)]",
  ORDERED: "bg-amber-500",
  DELIVERED: "bg-[var(--success)]",
  INSTALLED: "bg-[var(--success)]",
  COMPLETED: "bg-[var(--success)]",
  RESOLVED: "bg-[var(--success)]",
  PAID: "bg-[var(--success)]",
  CANCELLED: "bg-red-500",
  ON_HOLD: "bg-orange-500",
  OPEN: "bg-[var(--alert)]",
  FAILED: "bg-red-500",
  DUE: "bg-amber-500",
  OVERDUE: "bg-[var(--alert)]",
};

export function StatusBadge({ status, dot = false }: { status: string; dot?: boolean }) {
  const { t } = useI18n();

  if (dot) {
    const color = dotColors[status] || dotColors.PENDING;
    return <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${color}`} title={t(`status.${status}` as TKey)} />;
  }

  const style = statusStyles[status] || statusStyles.PENDING;
  const key = `status.${status}` as TKey;

  return (
    <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-[11px] font-semibold ring-1 ${style}`}>
      {t(key)}
    </span>
  );
}
