"use client";

import { useProject } from "@/hooks/useProject";
import { useI18n } from "@/lib/i18n";
import { useApi } from "@/hooks/useApi";
import { useFinancials } from "@/hooks/useFinancials";
import { useTranslate } from "@/hooks/useTranslate";
import { Card, StatCard } from "@/components/Card";
import { Expandable } from "@/components/Expandable";
import { TaskLine, MilestoneLine } from "@/components/TaskLine";
import { StatusBadge } from "@/components/StatusBadge";
import { useRouter } from "next/navigation";
import { ExportButtons } from "@/components/ExportButtons";
import { AlertTriangle, Wallet, Layers, Package, TrendingUp, CalendarDays, ArrowUpRight, PiggyBank } from "lucide-react";

export default function DashboardPage() {
  const { t, lang } = useI18n();
  const router = useRouter();
  const { activeProject: project } = useProject();
  const { data: nodes } = useApi<any[]>(project ? `/api/nodes?projectId=${project.id}` : null);
  const { data: issues } = useApi<any[]>(project ? "/api/issues" : null);
  const fin = useFinancials(project?.id);

  const rootNodes = nodes?.filter((n: any) => !n.parentId) || [];
  const leafNodes = nodes?.filter((n: any) => n.parentId) || [];
  const costNodes = nodes?.filter((n: any) => n.expectedCost) || [];
  const openIssues = issues?.filter((i: any) => i.status !== "RESOLVED") || [];

  const allTexts = [project?.name, ...(nodes?.map((n: any) => n.name) || []), ...openIssues.map((i: any) => i.title), ...openIssues.map((i: any) => i.node?.name).filter(Boolean)].filter(Boolean);
  const tr = useTranslate(allTexts);

  const fmt = (n: number) => new Intl.NumberFormat(lang === "he" ? "he-IL" : "en-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(n);

  if (!project) return <div className="flex h-64 items-center justify-center text-[var(--fg-muted)]">{t("general.loading")}</div>;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-[var(--fg)] p-5 md:p-8 text-[var(--bg-elevated)]">
        <div className="absolute end-0 top-0 h-full w-1/2 bg-gradient-to-l from-[var(--accent)]/10 to-transparent" />
        <div className="relative">
          <p className="text-sm font-medium text-[var(--accent)]">{t("dash.welcome")}</p>
          <h1 className="mt-1 text-xl md:text-3xl font-bold tracking-tight">{tr(project.name)}</h1>
        </div>
      </div>

      {/* Export & Share */}
      <ExportButtons projectId={project.id} />

      {/* Financial stats — ALL expandable */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
        <StatCard label={t("dash.budget")} value={fmt(fin.totalBudget)} icon={<Wallet size={18} />}>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between"><span className="text-[var(--fg-muted)]">{t("costs.totalCost")}</span><span className="font-semibold">{fmt(fin.totalCost)}</span></div>
            <div className="flex justify-between"><span className="text-[var(--fg-muted)]">{t("dash.tasks")}</span><span className="font-semibold">{costNodes.length} {t("dash.tasks").toLowerCase()}</span></div>
          </div>
        </StatCard>

        <StatCard label={t("costs.totalPaid")} value={fmt(fin.totalPaid)} icon={<TrendingUp size={18} />}>
          <div className="max-h-40 overflow-y-auto space-y-0.5">
            {fin.paidMilestones.length === 0 ? <p className="text-xs text-[var(--fg-muted)]">—</p> :
              fin.paidMilestones.map((m: any) => <MilestoneLine key={m.id} m={m} tr={tr} />)}
          </div>
        </StatCard>

        <StatCard label={t("costs.totalRemaining")} value={fmt(fin.remainingToPay)} accent={fin.remainingToPay > 0} icon={<CalendarDays size={18} />}>
          <div className="space-y-2 text-xs">
            <div className="space-y-1">
              <div className="flex justify-between"><span className="text-[var(--fg-muted)]">{t("costs.totalCost")}</span><span className="font-semibold">{fmt(fin.totalCost)}</span></div>
              <div className="flex justify-between"><span className="text-[var(--fg-muted)]">{t("costs.totalPaid")}</span><span className="font-semibold text-[var(--success)]">-{fmt(fin.totalPaid)}</span></div>
              {fin.unscheduled > 0 && <div className="flex justify-between"><span className="text-[var(--fg-muted)]">{t("costs.unscheduled")}</span><span className="font-semibold text-[var(--alert)]">{fmt(fin.unscheduled)}</span></div>}
            </div>
            {fin.unpaidMilestones.length > 0 && (
              <div className="max-h-28 overflow-y-auto border-t border-[var(--border-subtle)] pt-1.5 space-y-0.5">
                {fin.unpaidMilestones.map((m: any) => <MilestoneLine key={m.id} m={m} tr={tr} />)}
              </div>
            )}
          </div>
        </StatCard>

        <StatCard label={t("task.budgetRemaining")} value={fmt(fin.budgetRemaining)} accent={fin.budgetRemaining < 0} icon={<PiggyBank size={18} />}>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between"><span className="text-[var(--fg-muted)]">{t("dash.budget")}</span><span className="font-semibold">{fmt(fin.totalBudget)}</span></div>
            <div className="flex justify-between"><span className="text-[var(--fg-muted)]">{t("costs.totalCost")}</span><span className="font-semibold">{fmt(fin.totalCost)}</span></div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--border-subtle)] mt-1">
              <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${Math.min(fin.costPct, 100)}%` }} />
            </div>
            <p className="text-center text-[10px] text-[var(--fg-muted)]">{fin.costPct}% {t("task.ofBudget")}</p>
          </div>
        </StatCard>

        <StatCard label={t("dash.openIssues")} value={openIssues.length} accent={openIssues.length > 0} icon={<AlertTriangle size={18} />}>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {openIssues.length === 0 ? <p className="text-xs text-[var(--fg-muted)]">{t("dash.noIssues")}</p> :
              openIssues.map((iss: any) => (
                <div key={iss.id} className="flex items-center justify-between text-xs py-1">
                  <span className="text-[var(--fg)]">{tr(iss.title)}</span>
                  <StatusBadge status={iss.status} />
                </div>
              ))}
          </div>
        </StatCard>
      </div>

      {/* Progress bar */}
      <Card>
        <div className="flex items-center justify-between text-xs text-[var(--fg-muted)]">
          <span>{t("costs.totalPaid")} / {t("costs.totalCost")}</span>
          <span className="font-semibold text-[var(--fg)]">{fin.paidPct}%</span>
        </div>
        <div className="mt-1.5 h-3 w-full overflow-hidden rounded-full bg-[var(--border-subtle)]">
          <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${Math.min(fin.paidPct, 100)}%`, background: "linear-gradient(90deg, var(--success), #78B080)" }} />
        </div>
      </Card>

      {/* Task groups + leaf tasks — expandable */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
        <StatCard label={t("dash.groups")} value={rootNodes.length} icon={<Layers size={18} />}>
          <div className="max-h-48 overflow-y-auto space-y-0.5">
            {rootNodes.map((n: any) => <TaskLine key={n.id} node={n} tr={tr} compact />)}
          </div>
        </StatCard>
        <StatCard label={t("dash.tasks")} value={leafNodes.length} icon={<Package size={18} />}>
          <div className="max-h-48 overflow-y-auto space-y-0.5">
            {leafNodes.slice(0, 15).map((n: any) => <TaskLine key={n.id} node={n} tr={tr} compact />)}
            {leafNodes.length > 15 && <p className="text-xs text-[var(--fg-muted)] pt-1">{leafNodes.length - 15} more...</p>}
          </div>
        </StatCard>
      </div>

      {/* Snag Alerts — expandable */}
      <Card>
        <h2 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-[var(--fg-muted)]">
          <AlertTriangle size={14} className={openIssues.length > 0 ? "text-[var(--alert)]" : ""} />
          {t("dash.snagAlerts")}
          {openIssues.length > 0 && <span className="rounded-full bg-[var(--alert-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--alert)]">{openIssues.length}</span>}
        </h2>
        {openIssues.length === 0 ? (
          <p className="py-4 text-center text-sm text-[var(--fg-muted)]">{t("dash.noIssues")}</p>
        ) : (
          <div className="space-y-1">
            {openIssues.map((issue: any) => (
              <Expandable key={issue.id} trigger={
                <div className="flex items-center gap-3 py-1">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[var(--fg)]">{tr(issue.title)}</p>
                    <p className="text-xs text-[var(--fg-muted)]">{issue.node?.name ? tr(issue.node.name) : ""}</p>
                  </div>
                  <StatusBadge status={issue.status} />
                </div>
              }>
                <div className="rounded-lg bg-[var(--bg)] p-3 text-xs space-y-2">
                  {issue.description && <p className="text-[var(--fg-muted)]">{tr(issue.description)}</p>}
                  {issue.node && <TaskLine node={issue.node} tr={tr} compact />}
                  <button onClick={() => router.push("/issues")} className="flex items-center gap-1 text-[var(--accent)] font-medium hover:underline">
                    <ArrowUpRight size={12} />{t("nav.issues")}
                  </button>
                </div>
              </Expandable>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
