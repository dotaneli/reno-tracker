"use client";

import { useMemo, useState } from "react";
import { useProject } from "@/hooks/useProject";
import { useI18n, type TKey } from "@/lib/i18n";
import { useApi, apiPatch, apiDelete } from "@/hooks/useApi";
import { useFinancials } from "@/hooks/useFinancials";
import { useTranslate } from "@/hooks/useTranslate";
import { Card, StatCard } from "@/components/Card";
import { Expandable } from "@/components/Expandable";
import { TaskLine, MilestoneLine } from "@/components/TaskLine";
import { StatusBadge } from "@/components/StatusBadge";
import { mutate } from "swr";
import {
  AlertTriangle, Wallet, TrendingUp, CalendarDays, PiggyBank,
  ChevronLeft, ChevronRight, CircleDollarSign, CheckCircle2,
  AlertCircle, Pencil, Trash2, LayoutDashboard, CreditCard, Bug,
} from "lucide-react";

// ── Tab types ──
type Tab = "overview" | "payments" | "issues";

// ── SVG Donut Chart with hover tooltips + data labels ──
function DonutChart({ segments, size: propSize = 200, strokeWidth: propStrokeWidth = 32, fmt, totalLabel = "Total" }: { segments: { value: number; color: string; label: string }[]; size?: number; strokeWidth?: number; fmt: (n: number) => string; totalLabel?: string }) {
  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
  const size = isMobile ? Math.min(propSize, 160) : propSize;
  const strokeWidth = isMobile ? Math.min(propStrokeWidth, 24) : propStrokeWidth;
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
                strokeLinecap="butt"
                className="transition-all duration-300 cursor-pointer"
                style={{ filter: isHovered ? "brightness(1.1)" : undefined }}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {hover !== null ? (
            <>
              <p className="text-sm sm:text-lg font-bold text-[var(--fg)]">{fmt(activeSegments[hover].value)}</p>
              <p className="max-w-[80px] sm:max-w-none truncate text-center text-[9px] sm:text-[10px] text-[var(--fg-muted)]">{activeSegments[hover].label}</p>
              <p className="text-[9px] sm:text-[10px] font-semibold" style={{ color: activeSegments[hover].color }}>{Math.round(activeSegments[hover].value / total * 100)}%</p>
            </>
          ) : (
            <>
              <p className="text-sm sm:text-lg font-bold text-[var(--fg)]">{fmt(total)}</p>
              <p className="text-[9px] sm:text-[10px] text-[var(--fg-muted)]">{totalLabel}</p>
            </>
          )}
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-x-3 sm:gap-x-4 gap-y-1">
        {activeSegments.map((seg, i) => (
          <div
            key={i}
            className={`flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-[11px] cursor-pointer rounded-md px-1 sm:px-1.5 py-0.5 transition-all ${hover === i ? "bg-[var(--warm-glow)]" : ""}`}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          >
            <div className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
            <span className="text-[var(--fg-muted)] max-w-[60px] sm:max-w-none truncate">{seg.label}</span>
            <span className="font-semibold text-[var(--fg)]">{Math.round(seg.value / total * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Inline edit styles (from issues page) ──
const inputCls = "w-full rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--fg)] placeholder-[var(--fg-muted)]/60 outline-none transition-all focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/10";
const selCls = "w-full appearance-none rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3 pe-9 text-sm text-[var(--fg)] outline-none transition-all focus:border-[var(--accent)]";

export default function HomePage() {
  const { t, lang } = useI18n();
  const { activeProject: project, loading } = useProject();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [calMonth, setCalMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  // Issues inline edit state
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: "", nodeId: "", description: "", status: "OPEN" });
  const [error, setError] = useState("");
  const { data: nodes } = useApi<any[]>(project ? `/api/nodes?projectId=${project.id}` : null);
  const { data: issues } = useApi<any[]>(project ? `/api/issues?projectId=${project.id}` : null);
  const fin = useFinancials(project?.id);

  const mutateAll = () => {
    mutate(`/api/nodes?projectId=${project?.id}`);
    mutate(`/api/projects/${project?.id}/milestones`);
    mutate(`/api/projects`);
    mutate(`/api/issues`);
  };

  const leafNodes = nodes?.filter((n: any) => n.parentId) || [];
  const costNodes = nodes?.filter((n: any) => n.expectedCost) || [];
  const openIssues = issues?.filter((i: any) => i.status !== "RESOLVED") || [];

  const allTexts = useMemo(() => [
    project?.name,
    ...(nodes?.map((n: any) => n.name) || []),
    ...(issues?.map((i: any) => i.title) || []),
    ...(issues?.map((i: any) => i.description).filter(Boolean) || []),
    ...(issues?.map((i: any) => i.node?.name).filter(Boolean) || []),
  ].filter(Boolean), [project, nodes, issues]);
  const tr = useTranslate(allTexts);

  const fmt = (n: number) => new Intl.NumberFormat(lang === "he" ? "he-IL" : "en-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(n);

  // ── Unpaid deepdive computation (from costs page) ──
  const ms = fin.milestones;
  const upcomingMilestones = fin.unpaidMilestones.filter((m: any) => m.dueDate).sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const unpaidData = useMemo(() => {
    const nodePayments = new Map<string, { milestoned: number; paid: number; unpaidMs: any[] }>();
    for (const m of ms) {
      if (!nodePayments.has(m.nodeId)) nodePayments.set(m.nodeId, { milestoned: 0, paid: 0, unpaidMs: [] });
      const np = nodePayments.get(m.nodeId)!;
      np.milestoned += Number(m.amount);
      if (m.status === "PAID") np.paid += Number(m.amount);
      else np.unpaidMs.push(m);
    }

    const pendingGroups: { nodeId: string; name: string; cost: number; paid: number; remaining: number; unpaidMs: any[]; gap: number }[] = [];
    const gapGroups: { nodeId: string; name: string; cost: number; paid: number; gap: number; node: any }[] = [];

    for (const [nodeId, np] of nodePayments) {
      const node = (nodes || []).find((n: any) => n.id === nodeId);
      const cost = Number(node?.expectedCost || 0);
      const gap = cost > np.milestoned ? cost - np.milestoned : 0;

      if (np.unpaidMs.length > 0) {
        const remaining = np.unpaidMs.reduce((s: number, m: any) => s + Number(m.amount), 0) + gap;
        pendingGroups.push({ nodeId, name: np.unpaidMs[0]?.nodeName || node?.name || "\u2014", cost, paid: np.paid, remaining, unpaidMs: np.unpaidMs, gap });
      } else if (gap > 0) {
        gapGroups.push({ nodeId, name: node?.name || "\u2014", cost, paid: np.paid, gap, node });
      }
    }

    pendingGroups.sort((a, b) => b.remaining - a.remaining);
    gapGroups.sort((a, b) => b.gap - a.gap);

    const noPaymentTasks = (nodes || []).filter((n: any) => Number(n.expectedCost) > 0 && !nodePayments.has(n.id));
    noPaymentTasks.sort((a: any, b: any) => Number(b.expectedCost) - Number(a.expectedCost));
    const noPaymentTotal = noPaymentTasks.reduce((s: number, n: any) => s + Number(n.expectedCost), 0);
    const pendingTotal = pendingGroups.reduce((s, g) => s + g.remaining, 0);
    const gapTotal = gapGroups.reduce((s, g) => s + g.gap, 0);

    return { pendingGroups, gapGroups, noPaymentTasks, noPaymentTotal, pendingTotal, gapTotal };
  }, [ms, nodes]);

  // ── Calendar computation (from costs page) ──
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

  // ── Issues helpers (from issues page) ──
  const sortedIssues = useMemo(() => {
    if (!issues) return [];
    const order = { OPEN: 0, IN_PROGRESS: 1, RESOLVED: 2 };
    return [...issues].sort((a, b) => (order[a.status as keyof typeof order] ?? 3) - (order[b.status as keyof typeof order] ?? 3));
  }, [issues]);

  const startEdit = (issue: any) => {
    setEditForm({ title: issue.title, nodeId: issue.nodeId, description: issue.description || "", status: issue.status });
    setEditId(issue.id);
    setError("");
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    try {
      await apiPatch(`/api/issues/${editId}`, { title: editForm.title, nodeId: editForm.nodeId, description: editForm.description || undefined, status: editForm.status });
      setEditId(null); mutate("/api/issues");
    } catch (err: any) { setError(err.message); }
  };

  const handleResolve = async (id: string) => {
    await apiPatch(`/api/issues/${id}`, { status: "RESOLVED" }); mutate("/api/issues");
  };

  const handleDelete = async (issue: any) => {
    if (!confirm(t("crud.deleteConfirm").replace("{name}", issue.title))) return;
    await apiDelete(`/api/issues/${issue.id}`); mutate("/api/issues");
  };

  // ── Task status summary ──
  const taskStatusSummary = useMemo(() => {
    const all = leafNodes;
    const completed = all.filter((n: any) => n.status === "COMPLETED").length;
    const inProgress = all.filter((n: any) => n.status === "IN_PROGRESS").length;
    const pending = all.length - completed - inProgress;
    return { completed, inProgress, pending };
  }, [leafNodes]);

  if (!project) {
    if (loading) return <div className="flex h-64 items-center justify-center text-[var(--fg-muted)]">{t("general.loading")}</div>;
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-[var(--fg-muted)]">
        <p>{t("proj.noProjects")}</p>
        <a href="/projects" className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white">{t("proj.create")}</a>
      </div>
    );
  }

  // ── Tab definitions ──
  const tabs: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: "overview", label: t("home.overview"), icon: <LayoutDashboard size={16} /> },
    { id: "payments", label: t("home.payments"), icon: <CreditCard size={16} /> },
    { id: "issues", label: t("home.issues"), icon: <Bug size={16} />, badge: openIssues.length > 0 ? openIssues.length : undefined },
  ];

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

      {/* Tab Bar */}
      <div className="sticky top-0 z-20 -mx-1 bg-[var(--bg)]/80 backdrop-blur-md px-1 py-1">
        <div className="flex gap-1 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
                activeTab === tab.id
                  ? "bg-[var(--fg)] text-[var(--bg-elevated)] shadow-sm"
                  : "text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--border-subtle)]/50"
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.badge && (
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                  activeTab === tab.id
                    ? "bg-[var(--alert)] text-white"
                    : "bg-[var(--alert-soft)] text-[var(--alert)]"
                }`}>{tab.badge}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════ */}
      {/* TAB 1: Overview                                    */}
      {/* ═══════════════════════════════════════════════════ */}
      {activeTab === "overview" && (
        <>
          {/* Donut + stats row */}
          <div className="grid gap-4 grid-cols-1 md:grid-cols-[auto_1fr]">
            <Card className="flex items-center justify-center !p-6">
              <DonutChart fmt={fmt} totalLabel={t("costs.totalCost")} segments={[
                { value: fin.totalPaid, color: "#5E8A66", label: t("costs.totalPaid") },
                { value: Math.max(fin.remainingToPay - fin.unscheduled, 0), color: "#B8956A", label: t("costs.pendingPayments") },
                { value: Math.max(fin.unscheduled, 0), color: "#C4614A", label: t("costs.unscheduled") },
                { value: Math.max(fin.budgetRemaining, 0), color: "#E8E3DD", label: t("task.budgetRemaining") },
              ]} />
            </Card>

            <div className="grid gap-3 grid-cols-1 sm:grid-cols-3 content-start">
              <StatCard label={t("costs.totalPaid")} value={fmt(fin.totalPaid)} icon={<TrendingUp size={18} />}>
                <div className="max-h-32 overflow-y-auto space-y-0.5">
                  {fin.paidMilestones.length === 0 ? <p className="text-xs text-[var(--fg-muted)]">{"\u2014"}</p> :
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

              <StatCard label={t("task.budgetRemaining")} value={fmt(fin.budgetRemaining)} accent={fin.budgetRemaining < 0} icon={<PiggyBank size={18} />}>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between"><span className="text-[var(--fg-muted)]">{t("dash.budget")}</span><span className="font-semibold">{fmt(fin.totalBudget)}</span></div>
                  <div className="flex justify-between"><span className="text-[var(--fg-muted)]">{t("costs.totalCost")}</span><span className="font-semibold">{fmt(fin.totalCost)}</span></div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--border-subtle)] mt-1">
                    <div className={`h-full rounded-full ${fin.budgetRemaining >= 0 ? "bg-[var(--success)]" : "bg-[var(--alert)]"}`} style={{ width: `${Math.min(fin.costPct, 100)}%` }} />
                  </div>
                  <p className="text-center text-[10px] text-[var(--fg-muted)]">{fin.costPct}% {t("task.ofBudget")}</p>
                </div>
              </StatCard>
            </div>
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

          {/* Task status summary */}
          <Card>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-[var(--fg-muted)] font-medium">{t("dash.tasks")}:</span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-[var(--success)]" />
                <span className="font-semibold text-[var(--fg)]">{taskStatusSummary.completed}</span>
                <span className="text-[var(--fg-muted)]">{t("status.COMPLETED").toLowerCase()}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-[var(--accent)]" />
                <span className="font-semibold text-[var(--fg)]">{taskStatusSummary.inProgress}</span>
                <span className="text-[var(--fg-muted)]">{t("status.IN_PROGRESS").toLowerCase()}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-[var(--border-subtle)]" />
                <span className="font-semibold text-[var(--fg)]">{taskStatusSummary.pending}</span>
                <span className="text-[var(--fg-muted)]">{t("status.PENDING").toLowerCase()}</span>
              </span>
            </div>
          </Card>
        </>
      )}

      {/* ═══════════════════════════════════════════════════ */}
      {/* TAB 2: Payments                                    */}
      {/* ═══════════════════════════════════════════════════ */}
      {activeTab === "payments" && (
        <>
          {/* Unpaid Deepdive */}
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
            ) : (() => {
              const activeCols = [unpaidData.pendingGroups.length > 0, unpaidData.gapGroups.length > 0, unpaidData.noPaymentTasks.length > 0].filter(Boolean).length;
              const gridClass = activeCols === 1 ? "space-y-2" : activeCols === 2 ? "grid gap-4 grid-cols-1 md:grid-cols-2" : "grid gap-4 grid-cols-1 md:grid-cols-3";
              return (
              <div className={gridClass}>
                {/* Column 1: Pending Payments */}
                {unpaidData.pendingGroups.length > 0 && <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent)]">{t("costs.pendingPayments")}</p>
                    {unpaidData.pendingTotal > 0 && <span className="text-[10px] font-bold text-[var(--accent)]">{fmt(unpaidData.pendingTotal)}</span>}
                  </div>
                  {unpaidData.pendingGroups.map((g) => {
                    const node = (nodes || []).find((n: any) => n.id === g.nodeId);
                    return (
                      <Card key={g.nodeId} className="!p-2">
                        {node ? (
                          <TaskLine node={node} tr={tr} compact onMutate={mutateAll} allProjectMilestones={ms} />
                        ) : (
                          <div className="px-2 py-1.5 text-xs font-semibold text-[var(--fg)]">{tr(g.name)}</div>
                        )}
                      </Card>
                    );
                  })}
                </div>}

                {/* Column 2: Partially Scheduled (gap only) */}
                {unpaidData.gapGroups.length > 0 && <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">{t("costs.gapPayments")}</p>
                    <span className="text-[10px] font-bold text-amber-600">{fmt(unpaidData.gapTotal)}</span>
                  </div>
                  {unpaidData.gapGroups.map((g) => (
                    <Card key={g.nodeId} className="!p-2">
                      {g.node ? <TaskLine node={g.node} tr={tr} compact onMutate={mutateAll} allProjectMilestones={ms} /> : (
                        <div className="flex items-center justify-between gap-2 px-2 py-1.5">
                          <p className="text-xs font-semibold text-[var(--fg)]">{tr(g.name)}</p>
                          <p className="text-xs font-bold text-amber-600">{fmt(g.gap)}</p>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>}

                {/* Column 3: No Payments Scheduled */}
                {unpaidData.noPaymentTasks.length > 0 && <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--alert)]">{t("costs.unscheduledTasks")}</p>
                    <span className="text-[10px] font-bold text-[var(--alert)]">{fmt(unpaidData.noPaymentTotal)}</span>
                  </div>
                  {unpaidData.noPaymentTasks.map((n: any) => (
                    <Card key={n.id} className="!p-2">
                      <TaskLine node={n} tr={tr} compact onMutate={mutateAll} allProjectMilestones={ms} />
                    </Card>
                  ))}
                </div>}
              </div>
              );
            })()}
          </div>

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
                        {nodes?.find((n: any) => n.id === m.nodeId) && <TaskLine node={nodes.find((n: any) => n.id === m.nodeId)} tr={tr} compact onMutate={mutateAll} allProjectMilestones={ms} />}
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
                        {nodes?.find((n: any) => n.id === m.nodeId) && <TaskLine node={nodes.find((n: any) => n.id === m.nodeId)} tr={tr} compact onMutate={mutateAll} allProjectMilestones={ms} />}
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
        </>
      )}

      {/* ═══════════════════════════════════════════════════ */}
      {/* TAB 3: Issues                                      */}
      {/* ═══════════════════════════════════════════════════ */}
      {activeTab === "issues" && (
        <>
          {/* Open issues count */}
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold tracking-tight text-[var(--fg)]">{t("issues.title")}</h2>
            {openIssues.length > 0 && (
              <span className="flex items-center gap-1.5 rounded-full bg-[var(--alert-soft)] px-3 py-1 text-sm font-bold text-[var(--alert)]">
                <AlertCircle size={14} />{openIssues.length} {t("issues.open").toLowerCase()}
              </span>
            )}
          </div>

          {!issues ? (
            <p className="py-16 text-center text-sm text-[var(--fg-muted)]">{t("general.loading")}</p>
          ) : sortedIssues.length === 0 ? (
            <Card>
              <div className="flex flex-col items-center gap-3 py-12">
                <div className="rounded-full bg-[var(--success-soft)] p-3"><CheckCircle2 size={24} className="text-[var(--success)]" /></div>
                <p className="font-medium text-[var(--success)]">{t("dash.noIssues")}</p>
              </div>
            </Card>
          ) : (
            <div className="space-y-2">
              {sortedIssues.map((issue: any) => {
                const isResolved = issue.status === "RESOLVED";
                return (
                  <Card key={issue.id} className={isResolved && editId !== issue.id ? "opacity-60" : ""}>
                    {editId === issue.id ? (
                      /* Inline edit */
                      <form onSubmit={handleEdit} className="space-y-3">
                        <button type="button" onClick={() => setEditId(null)} className="flex w-full items-center justify-between rounded-lg px-1 py-1 -mx-1 transition-colors hover:bg-[var(--border-subtle)]">
                          <div className="flex items-center gap-2">
                            <AlertCircle size={14} className="text-[var(--accent)]" />
                            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent)]">{t("crud.edit")}</p>
                          </div>
                        </button>
                        <input type="text" placeholder={t("issues.issueTitle")} value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} required className={inputCls} autoFocus />
                        <div className="grid grid-cols-2 gap-3">
                          <div className="relative">
                            <select value={editForm.nodeId} onChange={(e) => setEditForm({ ...editForm, nodeId: e.target.value })} required className={selCls}>
                              <option value="">{t("task.selectTask")}</option>
                              {nodes?.map((sp: any) => <option key={sp.id} value={sp.id}>{tr(sp.name)}</option>)}
                            </select>
                          </div>
                          <div className="relative">
                            <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })} className={selCls}>
                              <option value="OPEN">{t("issues.open")}</option>
                              <option value="IN_PROGRESS">{t("issues.inProgress")}</option>
                              <option value="RESOLVED">{t("issues.resolved")}</option>
                            </select>
                          </div>
                        </div>
                        <textarea placeholder={t("issues.description")} value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} rows={3} className={`${inputCls} resize-none`} />
                        {error && editId === issue.id && <p className="text-xs font-medium text-[var(--alert)]">{error}</p>}
                        <div className="flex gap-2">
                          <button type="submit" className="flex-1 rounded-xl bg-[var(--accent)] py-2.5 text-sm font-semibold text-white">{t("task.save")}</button>
                          <button type="button" onClick={() => setEditId(null)} className="rounded-xl bg-[var(--border-subtle)] px-5 py-2.5 text-sm text-[var(--fg-secondary)]">{t("task.cancel")}</button>
                        </div>
                      </form>
                    ) : (
                      /* Normal display */
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-semibold ${isResolved ? "text-[var(--fg-muted)] line-through" : "text-[var(--fg)]"}`}>{tr(issue.title)}</p>
                          {issue.description && <p className="mt-1 text-xs leading-relaxed text-[var(--fg-muted)]">{tr(issue.description)}</p>}
                          <p className="mt-1.5 text-[11px] text-[var(--fg-muted)]/60">{issue.node?.name ? tr(issue.node.name) : ""}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <StatusBadge status={issue.status} />
                          {!isResolved && (
                            <button onClick={() => handleResolve(issue.id)} className="rounded-lg p-2 text-[var(--fg-muted)]/30 transition-all hover:bg-[var(--success-soft)] hover:text-[var(--success)]" title={t("issues.resolved")}>
                              <CheckCircle2 size={16} />
                            </button>
                          )}
                          <button onClick={() => editId === issue.id ? setEditId(null) : startEdit(issue)} className={`rounded-lg p-2 transition-all ${editId === issue.id ? "bg-[var(--accent)] text-white hover:bg-[var(--alert)]" : "text-[var(--fg-muted)]/30 hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"}`} title={editId === issue.id ? t("task.cancel") : t("crud.edit")}>
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => handleDelete(issue)} className="rounded-lg p-2 text-[var(--fg-muted)]/30 transition-all hover:bg-[var(--alert-soft)] hover:text-[var(--alert)]" title={t("crud.delete")}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
