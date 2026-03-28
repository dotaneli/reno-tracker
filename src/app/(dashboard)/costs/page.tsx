"use client";

import { useMemo, useState } from "react";
import { useProject } from "@/hooks/useProject";
import { useI18n, type TKey } from "@/lib/i18n";
import { useApi } from "@/hooks/useApi";
import { useFinancials } from "@/hooks/useFinancials";
import { useTranslate } from "@/hooks/useTranslate";
import { Card, StatCard } from "@/components/Card";
import { Expandable } from "@/components/Expandable";
import { TaskLine, MilestoneLine } from "@/components/TaskLine";
import { StatusBadge } from "@/components/StatusBadge";
import { Wallet, TrendingUp, AlertTriangle, CalendarDays, ChevronLeft, ChevronRight, PiggyBank, CircleDollarSign, CheckCircle2 } from "lucide-react";

export default function CostsPage() {
  const { t, lang } = useI18n();
  const { activeProject: project } = useProject();
  const [calMonth, setCalMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  const { data: allNodes } = useApi<any[]>(project ? `/api/nodes?projectId=${project.id}` : null);
  const { data: rootNodes } = useApi<any[]>(project ? `/api/nodes?projectId=${project.id}&parentId=root` : null);
  const fin = useFinancials(project?.id);

  const allTexts = useMemo(() => [...(allNodes?.map((n: any) => n.name) || [])], [allNodes]);
  const tr = useTranslate(allTexts);
  const fmt = (n: number) => new Intl.NumberFormat(lang === "he" ? "he-IL" : "en-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(n);

  const ms = fin.milestones;
  const costNodes = allNodes?.filter((n: any) => n.expectedCost) || [];
  const upcomingMilestones = fin.unpaidMilestones.filter((m: any) => m.dueDate).sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const nodeBreakdown = useMemo(() => {
    if (!rootNodes || !allNodes || !ms.length) return [];
    return rootNodes.map((root: any) => {
      const descIds = new Set<string>();
      const collect = (id: string) => { descIds.add(id); allNodes.filter((n: any) => n.parentId === id).forEach((n: any) => collect(n.id)); };
      collect(root.id);
      const nodeMilestones = ms.filter((m: any) => descIds.has(m.nodeId));
      const childNodes = allNodes.filter((n: any) => descIds.has(n.id) && n.expectedCost);
      const expected = childNodes.reduce((s: number, n: any) => s + Number(n.expectedCost), 0);
      const paid = nodeMilestones.filter((m: any) => m.status === "PAID").reduce((s: number, m: any) => s + Number(m.amount), 0);
      return { id: root.id, name: root.name, type: root.nodeType, expected, paid, pct: expected > 0 ? (paid / expected) * 100 : 0, milestones: nodeMilestones, nodes: childNodes };
    }).filter((n) => n.expected > 0);
  }, [rootNodes, allNodes, ms]);

  const calDays = useMemo(() => {
    const y = calMonth.getFullYear(), mo = calMonth.getMonth();
    const first = new Date(y, mo, 1), last = new Date(y, mo + 1, 0);
    const days: { date: Date; milestones: any[] }[] = [];
    for (let i = -first.getDay(); i <= last.getDate() + (6 - last.getDay()); i++) {
      const d = new Date(y, mo, i + 1);
      days.push({ date: d, milestones: ms.filter((m: any) => { if (!m.dueDate) return false; const md = new Date(m.dueDate); return md.getFullYear() === d.getFullYear() && md.getMonth() === d.getMonth() && md.getDate() === d.getDate(); }) });
    }
    return days;
  }, [calMonth, ms]);

  const dayNames: TKey[] = ["costs.sun", "costs.mon", "costs.tue", "costs.wed", "costs.thu", "costs.fri", "costs.sat"];

  if (!project) return <p className="py-16 text-center text-sm text-[var(--fg-muted)]">{t("general.loading")}</p>;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[var(--fg)]">{t("costs.title")}</h1>

      {/* ALL stats expandable */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
        <StatCard label={t("dash.budget")} value={fmt(fin.totalBudget)} icon={<Wallet size={18} />}>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between"><span className="text-[var(--fg-muted)]">{t("costs.totalCost")}</span><span className="font-semibold">{fmt(fin.totalCost)}</span></div>
            <div className="flex justify-between"><span className="text-[var(--fg-muted)]">{t("dash.tasks")}</span><span>{costNodes.length}</span></div>
          </div>
        </StatCard>

        <StatCard label={t("costs.totalCost")} value={fmt(fin.totalCost)} icon={<TrendingUp size={18} />}>
          <div className="max-h-40 overflow-y-auto space-y-0.5">
            {costNodes.map((n: any) => <TaskLine key={n.id} node={n} tr={tr} compact />)}
          </div>
        </StatCard>

        <StatCard label={t("costs.totalPaid")} value={fmt(fin.totalPaid)} icon={<Wallet size={18} />}>
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
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--border-subtle)]">
              <div className={`h-full rounded-full ${fin.budgetRemaining >= 0 ? "bg-[var(--success)]" : "bg-[var(--alert)]"}`} style={{ width: `${Math.min(fin.costPct, 100)}%` }} />
            </div>
            <p className="text-center text-[10px] text-[var(--fg-muted)]">{fin.costPct}% {t("task.ofBudget")}</p>
          </div>
        </StatCard>
      </div>

      {/* Progress */}
      <Card>
        <div className="flex items-center justify-between text-xs text-[var(--fg-muted)]">
          <span>{t("costs.totalPaid")} / {t("costs.totalCost")}</span>
          <span className="font-semibold text-[var(--fg)]">{fin.paidPct}%</span>
        </div>
        <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-[var(--border-subtle)]">
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(fin.paidPct, 100)}%`, background: "linear-gradient(90deg, var(--success), #78B080)" }} />
        </div>
      </Card>

      {/* ── Unpaid Deepdive: milestones + gap + unscheduled tasks ── */}
      {(() => {
        // Build per-node payment picture
        const nodePayments = new Map<string, { milestoned: number; paid: number; unpaidMs: any[] }>();
        for (const m of ms) {
          if (!nodePayments.has(m.nodeId)) nodePayments.set(m.nodeId, { milestoned: 0, paid: 0, unpaidMs: [] });
          const np = nodePayments.get(m.nodeId)!;
          np.milestoned += Number(m.amount);
          if (m.status === "PAID") np.paid += Number(m.amount);
          else np.unpaidMs.push(m);
        }

        // 1. Tasks with unpaid milestones (grouped, includes gap info)
        const msGroups: { nodeId: string; taskName: string; taskCost: number; taskPaid: number; unpaidMs: any[]; gap: number }[] = [];
        for (const [nodeId, np] of nodePayments) {
          if (np.unpaidMs.length === 0) {
            // All milestones paid — but is there a gap?
            const node = (allNodes || []).find((n: any) => n.id === nodeId);
            const cost = Number(node?.expectedCost || 0);
            const gap = cost - np.milestoned;
            if (gap > 0) {
              msGroups.push({ nodeId, taskName: node?.name || "—", taskCost: cost, taskPaid: np.paid, unpaidMs: [], gap });
            }
            continue;
          }
          const node = (allNodes || []).find((n: any) => n.id === nodeId);
          const cost = Number(node?.expectedCost || 0);
          const gap = cost > np.milestoned ? cost - np.milestoned : 0;
          msGroups.push({ nodeId, taskName: np.unpaidMs[0]?.nodeName || node?.name || "—", taskCost: cost, taskPaid: np.paid, unpaidMs: np.unpaidMs, gap });
        }
        msGroups.sort((a, b) => {
          const aTotal = a.unpaidMs.reduce((s: number, m: any) => s + Number(m.amount), 0) + a.gap;
          const bTotal = b.unpaidMs.reduce((s: number, m: any) => s + Number(m.amount), 0) + b.gap;
          return bTotal - aTotal;
        });
        // Filter out groups with nothing owed
        const activeGroups = msGroups.filter(g => g.unpaidMs.length > 0 || g.gap > 0);

        // 2. Tasks with cost but NO milestones at all
        const noPaymentTasks = (allNodes || []).filter((n: any) => Number(n.expectedCost) > 0 && !nodePayments.has(n.id));
        const noPaymentTotal = noPaymentTasks.reduce((s: number, n: any) => s + Number(n.expectedCost), 0);

        // Grand total = what "Remaining to Pay" shows
        const grandUnpaid = fin.remainingToPay;
        const totalItems = activeGroups.length + noPaymentTasks.length;
        const hasAny = totalItems > 0;

        return (
          <div>
            <h2 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-[var(--fg-muted)]">
              <CircleDollarSign size={14} className={hasAny ? "text-[var(--alert)]" : "text-[var(--success)]"} />
              {t("costs.unpaidBreakdown")}
              {hasAny && (
                <span className="rounded-full bg-[var(--alert-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--alert)]">{totalItems} · {fmt(grandUnpaid)}</span>
              )}
            </h2>
            {!hasAny ? (
              <Card>
                <div className="flex items-center gap-2 py-4 justify-center">
                  <CheckCircle2 size={16} className="text-[var(--success)]" />
                  <p className="text-sm font-medium text-[var(--success)]">{t("costs.noUnpaid")}</p>
                </div>
              </Card>
            ) : (
              <div className="space-y-2">
                {/* Tasks with unpaid milestones and/or gaps */}
                {activeGroups.map((group) => {
                  const msUnpaid = group.unpaidMs.reduce((s: number, m: any) => s + Number(m.amount), 0);
                  const groupTotal = msUnpaid + group.gap;
                  const hasOverdue = group.unpaidMs.some((m: any) => m.dueDate && new Date(m.dueDate) < new Date());
                  return (
                    <Card key={group.nodeId} className={hasOverdue ? "border-[var(--alert)]/20" : ""}>
                      <Expandable trigger={
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-[var(--fg)]">{tr(group.taskName)}</p>
                            <p className="text-[11px] text-[var(--fg-muted)]">
                              {group.taskCost > 0 && <>{fmt(group.taskPaid)} / {fmt(group.taskCost)}</>}
                              {group.unpaidMs.length > 0 && <> · {group.unpaidMs.length} {t("task.milestones").toLowerCase()}</>}
                              {group.gap > 0 && <> · {fmt(group.gap)} {t("costs.unscheduled").toLowerCase()}</>}
                              {hasOverdue && <span className="ms-2 text-[var(--alert)]">{t("costs.overdue")}</span>}
                            </p>
                          </div>
                          <p className={`text-sm font-bold ${hasOverdue ? "text-[var(--alert)]" : "text-[var(--fg)]"}`}>{fmt(groupTotal)}</p>
                        </div>
                      }>
                        <div className="space-y-1 rounded-lg bg-[var(--bg)] p-2">
                          {group.unpaidMs.map((m: any) => {
                            const isOverdue = m.dueDate && new Date(m.dueDate) < new Date();
                            return (
                              <div key={m.id} className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-xs hover:bg-[var(--warm-glow)]">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="font-medium text-[var(--fg)]">{m.label}</span>
                                  {m.dueDate && (
                                    <span className={`text-[11px] ${isOverdue ? "font-semibold text-[var(--alert)]" : "text-[var(--fg-muted)]"}`}>
                                      {new Date(m.dueDate).toLocaleDateString(lang === "he" ? "he-IL" : "en-IL", { day: "numeric", month: "short" })}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className="font-semibold">{fmt(Number(m.amount))}</span>
                                  <StatusBadge status={m.status} />
                                </div>
                              </div>
                            );
                          })}
                          {group.gap > 0 && (
                            <div className="flex items-center justify-between gap-3 rounded-lg bg-amber-50 px-2 py-1.5 text-xs">
                              <span className="font-medium text-amber-700">{t("costs.unscheduled")}</span>
                              <span className="font-semibold text-amber-700">{fmt(group.gap)}</span>
                            </div>
                          )}
                        </div>
                      </Expandable>
                    </Card>
                  );
                })}

                {/* Tasks with cost but NO payments at all */}
                {noPaymentTasks.length > 0 && (
                  <>
                    <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-[var(--fg-muted)]">{t("costs.unscheduled")} — {noPaymentTasks.length} · {fmt(noPaymentTotal)}</p>
                    {noPaymentTasks.sort((a: any, b: any) => Number(b.expectedCost) - Number(a.expectedCost)).map((n: any) => (
                      <Card key={n.id}>
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[var(--fg)]">{tr(n.name)}</p>
                            <p className="text-[11px] text-[var(--fg-muted)]">{n.vendor?.name ? tr(n.vendor.name) : ""}{n.category?.name ? ` · ${tr(n.category.name)}` : ""}</p>
                          </div>
                          <p className="text-sm font-bold text-[var(--alert)]">{fmt(Number(n.expectedCost))}</p>
                        </div>
                      </Card>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* Per task group — expandable with tasks AND milestones */}
      {nodeBreakdown.length > 0 && (
        <div>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.15em] text-[var(--fg-muted)]">{t("costs.byTask")}</h2>
          <div className="space-y-2">
            {nodeBreakdown.map((sp) => (
              <Card key={sp.id}>
                <Expandable trigger={
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2"><p className="text-sm font-semibold text-[var(--fg)]">{tr(sp.name)}</p>{sp.type && <span className="rounded-lg bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-bold uppercase text-[var(--accent)]">{t(`type.${sp.type}` as TKey)}</span>}</div>
                      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[var(--border-subtle)]"><div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${Math.min(sp.pct, 100)}%` }} /></div>
                    </div>
                    <div className="shrink-0 text-end"><p className="text-sm font-bold text-[var(--fg)]">{fmt(sp.paid)}</p><p className="text-[11px] text-[var(--fg-muted)]">{t("costs.paidOf")} {fmt(sp.expected)}</p></div>
                  </div>
                }>
                  <div className="space-y-2">
                    {/* Tasks in this group */}
                    <div className="rounded-lg bg-[var(--bg)] p-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--fg-muted)] mb-1">{t("dash.tasks")}</p>
                      {sp.nodes.map((n: any) => <TaskLine key={n.id} node={n} tr={tr} compact />)}
                    </div>
                    {/* Milestones in this group */}
                    <div className="rounded-lg bg-[var(--bg)] p-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--fg-muted)] mb-1">{t("task.milestones")}</p>
                      {sp.milestones.map((m: any) => <MilestoneLine key={m.id} m={m} tr={tr} />)}
                    </div>
                  </div>
                </Expandable>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Overdue — each expandable */}
      {fin.overdueMilestones.length > 0 && (
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-[var(--alert)]">
            <AlertTriangle size={14} />{t("costs.overdue")} <span className="rounded-full bg-[var(--alert-soft)] px-2 py-0.5 text-[10px] font-bold">{fin.overdueMilestones.length}</span>
          </h2>
          <div className="space-y-2">
            {fin.overdueMilestones.map((m: any) => (
              <Card key={m.id} className="border-[var(--alert)]/20">
                <Expandable trigger={
                  <div className="flex items-center justify-between gap-3">
                    <div><p className="text-sm font-semibold text-[var(--fg)]">{m.label}</p><p className="text-xs text-[var(--fg-muted)]">{m.nodeName} · {new Date(m.dueDate).toLocaleDateString(lang === "he" ? "he-IL" : "en-IL")}</p></div>
                    <p className="text-lg font-bold text-[var(--alert)]">{fmt(Number(m.amount))}</p>
                  </div>
                }>
                  <div className="rounded-lg bg-[var(--bg)] p-2">
                    {allNodes?.find((n: any) => n.id === m.nodeId) && <TaskLine node={allNodes.find((n: any) => n.id === m.nodeId)} tr={tr} compact />}
                  </div>
                </Expandable>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming — each expandable */}
      {upcomingMilestones.length > 0 && (
        <div>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.15em] text-[var(--fg-muted)]">{t("costs.upcomingPayments")}</h2>
          <div className="space-y-2">
            {upcomingMilestones.slice(0, 10).map((m: any) => (
              <Card key={m.id}>
                <Expandable trigger={
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-[var(--fg)]">{m.label}</p><p className="text-xs text-[var(--fg-muted)]">{m.nodeName} · {new Date(m.dueDate).toLocaleDateString(lang === "he" ? "he-IL" : "en-IL", { day: "numeric", month: "short" })}</p></div>
                    <div className="flex items-center gap-2"><p className="text-sm font-bold">{fmt(Number(m.amount))}</p><StatusBadge status={m.status} /></div>
                  </div>
                }>
                  <div className="rounded-lg bg-[var(--bg)] p-2">
                    {allNodes?.find((n: any) => n.id === m.nodeId) && <TaskLine node={allNodes.find((n: any) => n.id === m.nodeId)} tr={tr} compact />}
                  </div>
                </Expandable>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Calendar — desktop only */}
      <div className="hidden sm:block">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-[var(--fg-muted)]">{t("costs.paymentCalendar")}</h2>
          <div className="flex items-center gap-3">
            <button onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1))} className="rounded-lg p-1.5 text-[var(--fg-muted)] hover:bg-[var(--border-subtle)]"><ChevronLeft size={16} /></button>
            <span className="min-w-[120px] text-center text-sm font-semibold text-[var(--fg)]">{calMonth.toLocaleDateString(lang === "he" ? "he-IL" : "en-IL", { month: "long", year: "numeric" })}</span>
            <button onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1))} className="rounded-lg p-1.5 text-[var(--fg-muted)] hover:bg-[var(--border-subtle)]"><ChevronRight size={16} /></button>
          </div>
        </div>
        <Card>
          <div className="grid grid-cols-7 gap-px">{dayNames.map((d) => <div key={d} className="pb-2 text-center text-[11px] font-semibold text-[var(--fg-muted)]">{t(d)}</div>)}</div>
          <div className="grid grid-cols-7 gap-px">
            {calDays.map(({ date, milestones: dayMs }, i) => {
              const inMonth = date.getMonth() === calMonth.getMonth();
              const today = (() => { const n = new Date(); return date.getDate() === n.getDate() && date.getMonth() === n.getMonth() && date.getFullYear() === n.getFullYear(); })();
              return (
                <div key={i} className={`relative min-h-[56px] rounded-lg p-1.5 text-[11px] ${inMonth ? "bg-[var(--bg-elevated)]" : "bg-[var(--bg)]"} ${today ? "ring-2 ring-[var(--accent)]" : ""}`} title={dayMs.map((m: any) => `${m.label}: ${fmt(Number(m.amount))}`).join("\n")}>
                  <span className={`${inMonth ? "text-[var(--fg)]" : "text-[var(--fg-muted)]/30"} ${today ? "font-bold text-[var(--accent)]" : ""}`}>{date.getDate()}</span>
                  {dayMs.length > 0 && <div className="mt-0.5 space-y-0.5">{dayMs.slice(0, 2).map((m: any) => <div key={m.id} className={`truncate rounded px-1 py-0.5 text-[8px] font-medium ${m.status === "PAID" ? "bg-[var(--success-soft)] text-[var(--success)]" : "bg-[var(--accent-soft)] text-[var(--accent)]"}`}>{fmt(Number(m.amount))}</div>)}</div>}
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
