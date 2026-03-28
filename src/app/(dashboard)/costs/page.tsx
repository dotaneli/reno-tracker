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
import { mutate } from "swr";
import { Wallet, TrendingUp, AlertTriangle, CalendarDays, ChevronLeft, ChevronRight, PiggyBank, CircleDollarSign, CheckCircle2 } from "lucide-react";

// ── SVG Donut Chart with hover tooltips + data labels ──
function DonutChart({ segments, size = 200, strokeWidth = 32, fmt }: { segments: { value: number; color: string; label: string }[]; size?: number; strokeWidth?: number; fmt: (n: number) => string }) {
  const [hover, setHover] = useState<number | null>(null);
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) return null;
  const r = (size - strokeWidth) / 2;
  const c = Math.PI * 2 * r;
  let offset = 0;
  const activeSegments = segments.filter(s => s.value > 0);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <svg width={size} height={size} className="drop-shadow-sm">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border-subtle)" strokeWidth={strokeWidth} />
          {activeSegments.map((seg, i) => {
            const pct = seg.value / total;
            const dash = c * pct;
            const gap = c - dash;
            const currentOffset = offset;
            offset += pct;
            const isHovered = hover === i;
            return (
              <circle
                key={i}
                cx={size / 2} cy={size / 2} r={r}
                fill="none" stroke={seg.color}
                strokeWidth={isHovered ? strokeWidth + 6 : strokeWidth}
                strokeDasharray={`${dash} ${gap}`}
                strokeDashoffset={-c * currentOffset + c * 0.25}
                strokeLinecap="round"
                className="transition-all duration-300 cursor-pointer"
                style={{ filter: isHovered ? "brightness(1.1)" : undefined }}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              />
            );
          })}
        </svg>
        {/* Center label — shows hovered segment or total */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {hover !== null ? (
            <>
              <p className="text-lg font-bold text-[var(--fg)]">{fmt(activeSegments[hover].value)}</p>
              <p className="text-[10px] text-[var(--fg-muted)]">{activeSegments[hover].label}</p>
              <p className="text-[10px] font-semibold" style={{ color: activeSegments[hover].color }}>{Math.round(activeSegments[hover].value / total * 100)}%</p>
            </>
          ) : (
            <>
              <p className="text-lg font-bold text-[var(--fg)]">{fmt(total)}</p>
              <p className="text-[10px] text-[var(--fg-muted)]">Total</p>
            </>
          )}
        </div>
      </div>
      {/* Legend with amounts */}
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5">
        {activeSegments.map((seg, i) => (
          <div
            key={i}
            className={`flex items-center gap-1.5 text-[11px] cursor-pointer rounded-md px-1.5 py-0.5 transition-all ${hover === i ? "bg-[var(--warm-glow)] scale-105" : ""}`}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          >
            <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
            <span className="text-[var(--fg-muted)]">{seg.label}</span>
            <span className="font-bold text-[var(--fg)]">{fmt(seg.value)}</span>
            <span className="text-[var(--fg-muted)]">({Math.round(seg.value / total * 100)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

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

  const mutateAll = () => { mutate(`/api/nodes?projectId=${project?.id}`); mutate(`/api/nodes?projectId=${project?.id}&parentId=root`); mutate(`/api/projects/${project?.id}/milestones`); mutate(`/api/projects`); };

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

  // Unpaid deepdive computation
  const unpaidData = useMemo(() => {
    const nodePayments = new Map<string, { milestoned: number; paid: number; unpaidMs: any[] }>();
    for (const m of ms) {
      if (!nodePayments.has(m.nodeId)) nodePayments.set(m.nodeId, { milestoned: 0, paid: 0, unpaidMs: [] });
      const np = nodePayments.get(m.nodeId)!;
      np.milestoned += Number(m.amount);
      if (m.status === "PAID") np.paid += Number(m.amount);
      else np.unpaidMs.push(m);
    }

    // Pending: tasks with unpaid milestones
    const pendingGroups: { nodeId: string; name: string; cost: number; paid: number; remaining: number; unpaidMs: any[]; gap: number }[] = [];
    // Gap-only: tasks with all milestones paid but milestoned < cost
    const gapGroups: { nodeId: string; name: string; cost: number; paid: number; gap: number; node: any }[] = [];

    for (const [nodeId, np] of nodePayments) {
      const node = (allNodes || []).find((n: any) => n.id === nodeId);
      const cost = Number(node?.expectedCost || 0);
      const gap = cost > np.milestoned ? cost - np.milestoned : 0;

      if (np.unpaidMs.length > 0) {
        const remaining = np.unpaidMs.reduce((s: number, m: any) => s + Number(m.amount), 0) + gap;
        pendingGroups.push({ nodeId, name: np.unpaidMs[0]?.nodeName || node?.name || "—", cost, paid: np.paid, remaining, unpaidMs: np.unpaidMs, gap });
      } else if (gap > 0) {
        gapGroups.push({ nodeId, name: node?.name || "—", cost, paid: np.paid, gap, node });
      }
    }

    pendingGroups.sort((a, b) => b.remaining - a.remaining);
    gapGroups.sort((a, b) => b.gap - a.gap);

    const noPaymentTasks = (allNodes || []).filter((n: any) => Number(n.expectedCost) > 0 && !nodePayments.has(n.id));
    noPaymentTasks.sort((a: any, b: any) => Number(b.expectedCost) - Number(a.expectedCost));
    const noPaymentTotal = noPaymentTasks.reduce((s: number, n: any) => s + Number(n.expectedCost), 0);
    const pendingTotal = pendingGroups.reduce((s, g) => s + g.remaining, 0);
    const gapTotal = gapGroups.reduce((s, g) => s + g.gap, 0);

    return { pendingGroups, gapGroups, noPaymentTasks, noPaymentTotal, pendingTotal, gapTotal };
  }, [ms, allNodes]);

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

      {/* ── Donut Chart + Stats ── */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-[auto_1fr]">
        <Card className="flex items-center justify-center !p-6">
          <DonutChart fmt={fmt} segments={[
            { value: fin.totalPaid, color: "#5E8A66", label: t("costs.totalPaid") },
            { value: Math.max(fin.remainingToPay - fin.unscheduled, 0), color: "#B8956A", label: t("costs.pendingPayments") },
            { value: Math.max(fin.unscheduled, 0), color: "#C4614A", label: t("costs.unscheduled") },
            { value: Math.max(fin.budgetRemaining, 0), color: "#E8E3DD", label: t("task.budgetRemaining") },
          ]} />
        </Card>

        <div className="grid gap-3 grid-cols-2 md:grid-cols-3 content-start">
          <StatCard label={t("dash.budget")} value={fmt(fin.totalBudget)} icon={<Wallet size={18} />}>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between"><span className="text-[var(--fg-muted)]">{t("costs.totalCost")}</span><span className="font-semibold">{fmt(fin.totalCost)}</span></div>
              <div className="flex justify-between"><span className="text-[var(--fg-muted)]">{t("dash.tasks")}</span><span>{costNodes.length}</span></div>
            </div>
          </StatCard>

          <StatCard label={t("costs.totalPaid")} value={fmt(fin.totalPaid)} icon={<TrendingUp size={18} />}>
            <div className="max-h-32 overflow-y-auto space-y-0.5">
              {fin.paidMilestones.length === 0 ? <p className="text-xs text-[var(--fg-muted)]">—</p> :
                fin.paidMilestones.map((m: any) => <MilestoneLine key={m.id} m={m} tr={tr} />)}
            </div>
          </StatCard>

          <StatCard label={t("costs.totalRemaining")} value={fmt(fin.remainingToPay)} accent={fin.remainingToPay > 0} icon={<CalendarDays size={18} />}>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between"><span className="text-[var(--fg-muted)]">{t("costs.totalCost")}</span><span className="font-semibold">{fmt(fin.totalCost)}</span></div>
              <div className="flex justify-between"><span className="text-[var(--fg-muted)]">{t("costs.totalPaid")}</span><span className="font-semibold text-[var(--success)]">-{fmt(fin.totalPaid)}</span></div>
              {fin.unscheduled > 0 && <div className="flex justify-between"><span className="text-[var(--fg-muted)]">{t("costs.unscheduled")}</span><span className="font-semibold text-[var(--alert)]">{fmt(fin.unscheduled)}</span></div>}
            </div>
          </StatCard>

          <StatCard label={t("costs.totalCost")} value={fmt(fin.totalCost)} icon={<TrendingUp size={18} />}>
            <div className="max-h-32 overflow-y-auto space-y-0.5">
              {costNodes.map((n: any) => <TaskLine key={n.id} node={n} tr={tr} compact onMutate={mutateAll} />)}
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

          <StatCard label={t("dash.openIssues")} value={fin.overdueMilestones.length} accent={fin.overdueMilestones.length > 0} icon={<AlertTriangle size={18} />}>
            <div className="max-h-32 overflow-y-auto space-y-0.5">
              {fin.overdueMilestones.length === 0 ? <p className="text-xs text-[var(--fg-muted)]">—</p> :
                fin.overdueMilestones.map((m: any) => <MilestoneLine key={m.id} m={m} tr={tr} />)}
            </div>
          </StatCard>
        </div>
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

      {/* ── Unpaid Deepdive — three equal sections ── */}
      <div>
        <h2 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-[var(--fg-muted)]">
          <CircleDollarSign size={14} className={fin.remainingToPay > 0 ? "text-[var(--alert)]" : "text-[var(--success)]"} />
          {t("costs.unpaidBreakdown")}
          {fin.remainingToPay > 0 && (
            <span className="rounded-full bg-[var(--alert-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--alert)]">{fmt(fin.remainingToPay)}</span>
          )}
        </h2>

        {fin.remainingToPay <= 0 ? (
          <Card>
            <div className="flex items-center gap-2 py-4 justify-center">
              <CheckCircle2 size={16} className="text-[var(--success)]" />
              <p className="text-sm font-medium text-[var(--success)]">{t("costs.noUnpaid")}</p>
            </div>
          </Card>
        ) : (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
            {/* Column 1: Pending Payments */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent)]">{t("costs.pendingPayments")}</p>
                {unpaidData.pendingTotal > 0 && <span className="text-[10px] font-bold text-[var(--accent)]">{fmt(unpaidData.pendingTotal)}</span>}
              </div>
              {unpaidData.pendingGroups.length === 0 ? (
                <p className="text-xs text-[var(--fg-muted)] py-2">—</p>
              ) : unpaidData.pendingGroups.map((g) => {
                const hasOverdue = g.unpaidMs.some((m: any) => m.dueDate && new Date(m.dueDate) < new Date());
                return (
                  <Card key={g.nodeId} className={`!p-3 ${hasOverdue ? "border-[var(--alert)]/20" : ""}`}>
                    <Expandable trigger={
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-[var(--fg)]">{tr(g.name)}</p>
                          <p className="text-[10px] text-[var(--fg-muted)]">{fmt(g.paid)} / {fmt(g.cost)}</p>
                        </div>
                        <p className="text-xs font-bold text-[var(--alert)]">{fmt(g.remaining)} <span className="font-normal text-[var(--fg-muted)]">({fmt(g.cost)})</span></p>
                      </div>
                    }>
                      <div className="space-y-1 rounded-lg bg-[var(--bg)] p-2 mt-1">
                        {g.unpaidMs.map((m: any) => (
                          <div key={m.id} className="flex items-center justify-between text-[11px] py-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[var(--fg)]">{m.label}</span>
                              {m.dueDate && <span className={`${new Date(m.dueDate) < new Date() ? "text-[var(--alert)] font-semibold" : "text-[var(--fg-muted)]"}`}>{new Date(m.dueDate).toLocaleDateString(lang === "he" ? "he-IL" : "en-IL", { day: "numeric", month: "short" })}</span>}
                            </div>
                            <div className="flex items-center gap-1"><span className="font-semibold">{fmt(Number(m.amount))}</span><StatusBadge status={m.status} /></div>
                          </div>
                        ))}
                        {g.gap > 0 && (
                          <div className="flex items-center justify-between text-[11px] py-0.5 rounded bg-amber-50 px-1.5">
                            <span className="text-amber-700">{t("costs.unscheduled")}</span>
                            <span className="font-semibold text-amber-700">{fmt(g.gap)}</span>
                          </div>
                        )}
                      </div>
                    </Expandable>
                  </Card>
                );
              })}
            </div>

            {/* Column 2: Partially Scheduled (gap only) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">{t("costs.gapPayments")}</p>
                {unpaidData.gapTotal > 0 && <span className="text-[10px] font-bold text-amber-600">{fmt(unpaidData.gapTotal)}</span>}
              </div>
              {unpaidData.gapGroups.length === 0 ? (
                <p className="text-xs text-[var(--fg-muted)] py-2">—</p>
              ) : unpaidData.gapGroups.map((g) => (
                <Card key={g.nodeId} className="!p-2">
                  {g.node ? <TaskLine node={g.node} tr={tr} compact onMutate={mutateAll} /> : (
                    <div className="flex items-center justify-between gap-2 px-2 py-1.5">
                      <p className="text-xs font-semibold text-[var(--fg)]">{tr(g.name)}</p>
                      <p className="text-xs font-bold text-amber-600">{fmt(g.gap)}</p>
                    </div>
                  )}
                </Card>
              ))}
            </div>

            {/* Column 3: No Payments Scheduled */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--alert)]">{t("costs.unscheduledTasks")}</p>
                {unpaidData.noPaymentTotal > 0 && <span className="text-[10px] font-bold text-[var(--alert)]">{fmt(unpaidData.noPaymentTotal)}</span>}
              </div>
              {unpaidData.noPaymentTasks.length === 0 ? (
                <p className="text-xs text-[var(--fg-muted)] py-2">—</p>
              ) : unpaidData.noPaymentTasks.map((n: any) => (
                <Card key={n.id} className="!p-2">
                  <TaskLine node={n} tr={tr} compact onMutate={mutateAll} />
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Per task group — expandable */}
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
                    <div className="rounded-lg bg-[var(--bg)] p-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--fg-muted)] mb-1">{t("dash.tasks")}</p>
                      {sp.nodes.map((n: any) => <TaskLine key={n.id} node={n} tr={tr} compact onMutate={mutateAll} />)}
                    </div>
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

      {/* Overdue */}
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
                    {allNodes?.find((n: any) => n.id === m.nodeId) && <TaskLine node={allNodes.find((n: any) => n.id === m.nodeId)} tr={tr} compact onMutate={mutateAll} />}
                  </div>
                </Expandable>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming */}
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
                    {allNodes?.find((n: any) => n.id === m.nodeId) && <TaskLine node={allNodes.find((n: any) => n.id === m.nodeId)} tr={tr} compact onMutate={mutateAll} />}
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
