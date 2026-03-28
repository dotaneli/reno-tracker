"use client";

import { useMemo } from "react";
import { useApi } from "./useApi";

export interface Financials {
  totalBudget: number;
  totalCost: number;         // sum of all node expectedCost
  totalPaid: number;         // sum of PAID milestones
  totalMilestoned: number;   // sum of ALL milestones (scheduled)
  remainingToPay: number;    // totalCost - totalPaid (what's still owed)
  unscheduled: number;       // totalCost - totalMilestoned (cost without milestones)
  budgetRemaining: number;   // budget - totalCost (unallocated budget)
  paidPct: number;           // paid / totalCost (how much of cost is paid)
  costPct: number;           // totalCost / budget
  milestones: any[];
  paidMilestones: any[];
  unpaidMilestones: any[];
  overdueMilestones: any[];
}

export function useFinancials(projectId: string | undefined): Financials & { loading: boolean } {
  const { data: allNodes } = useApi<any[]>(projectId ? `/api/nodes?projectId=${projectId}` : null);
  const { data: milestones } = useApi<any[]>(projectId ? `/api/projects/${projectId}/milestones` : null);
  const { data: projects } = useApi<any[]>("/api/projects");

  return useMemo(() => {
    const project = projects?.find((p: any) => p.id === projectId);
    const ms = milestones || [];
    const nodes = allNodes || [];

    const totalBudget = project ? Number(project.totalBudget) : 0;
    const totalCost = nodes.reduce((s: number, n: any) => s + (Number(n.expectedCost) || 0), 0);
    const totalPaid = ms.filter((m: any) => m.status === "PAID").reduce((s: number, m: any) => s + Number(m.amount), 0);
    const totalMilestoned = ms.reduce((s: number, m: any) => s + Number(m.amount), 0);
    const remainingToPay = totalCost - totalPaid;          // what's still owed overall
    const unscheduled = totalCost - totalMilestoned;       // cost that has no milestones yet
    const budgetRemaining = totalBudget - totalCost;
    const paidPct = totalCost > 0 ? Math.round((totalPaid / totalCost) * 100) : 0;
    const costPct = totalBudget > 0 ? Math.round((totalCost / totalBudget) * 100) : 0;

    const now = new Date();
    const paidMilestones = ms.filter((m: any) => m.status === "PAID");
    const unpaidMilestones = ms.filter((m: any) => m.status !== "PAID");
    const overdueMilestones = ms.filter((m: any) => m.status !== "PAID" && m.dueDate && new Date(m.dueDate) < now);

    return {
      totalBudget, totalCost, totalPaid, totalMilestoned,
      remainingToPay, unscheduled, budgetRemaining, paidPct, costPct,
      milestones: ms, paidMilestones, unpaidMilestones, overdueMilestones,
      loading: !project || !allNodes || !milestones,
    };
  }, [projects, allNodes, milestones, projectId]);
}
