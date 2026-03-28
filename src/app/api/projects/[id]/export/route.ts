import { prisma } from "@/lib/prisma";
import { requireUser, requireProjectAccess } from "@/lib/dal";
import { handleError } from "@/lib/api";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await requireUser();
    const { id } = await params;
    await requireProjectAccess(userId, id);

    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "csv";

    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) return new Response("Not found", { status: 404 });

    const nodes = await prisma.projectNode.findMany({
      where: { projectId: id },
      include: {
        vendor: { select: { name: true } },
        category: { select: { name: true } },
        milestones: { select: { label: true, amount: true, status: true, dueDate: true, paidDate: true } },
        rooms: { include: { room: { select: { name: true } } } },
        parent: { select: { name: true } },
      },
      orderBy: { sortOrder: "asc" },
    });

    const issues = await prisma.issue.findMany({
      where: { node: { projectId: id } },
      include: { node: { select: { name: true } } },
    });

    const totalBudget = Number(project.totalBudget);
    const totalCost = nodes.reduce((s, n) => s + (Number(n.expectedCost) || 0), 0);
    const totalPaid = nodes.flatMap((n) => n.milestones).filter((m) => m.status === "PAID").reduce((s, m) => s + Number(m.amount), 0);
    const remaining = totalCost - totalPaid;

    if (format === "csv") {
      return generateCsv(project, nodes, totalBudget, totalCost, totalPaid, remaining);
    } else if (format === "whatsapp") {
      return generateWhatsApp(project, nodes, issues, totalBudget, totalCost, totalPaid, remaining);
    } else if (format === "html") {
      return generateHtml(project, nodes, issues, totalBudget, totalCost, totalPaid, remaining);
    } else if (format === "infographic") {
      return generateInfographic(project, nodes, totalBudget, totalCost, totalPaid, remaining);
    }

    return new Response("Invalid format", { status: 400 });
  } catch (err) {
    return handleError(err);
  }
}

function fmtILS(n: number) {
  return new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(n);
}

function generateCsv(project: any, nodes: any[], budget: number, cost: number, paid: number, remaining: number) {
  const rows: string[][] = [];

  // Header info
  rows.push(["Project Report", project.name]);
  rows.push(["Generated", new Date().toLocaleDateString("en-IL")]);
  rows.push(["Budget", String(budget), "Total Cost", String(cost), "Paid", String(paid), "Remaining", String(remaining)]);
  rows.push([]);

  // Tasks header
  rows.push(["Task", "Parent", "Category", "Vendor", "Rooms", "Status", "Expected Cost", "Paid", "Remaining", "Payment %"]);

  for (const n of nodes) {
    const nodePaid = n.milestones.filter((m: any) => m.status === "PAID").reduce((s: number, m: any) => s + Number(m.amount), 0);
    const nodeCost = Number(n.expectedCost || 0);
    const nodeRemaining = nodeCost - nodePaid;
    const pct = nodeCost > 0 ? Math.round((nodePaid / nodeCost) * 100) : 0;
    const rooms = n.rooms.map((r: any) => r.room.name).join(", ");

    rows.push([
      n.name,
      n.parent?.name || "",
      n.category?.name || "",
      n.vendor?.name || "",
      rooms,
      n.status,
      String(nodeCost || ""),
      String(nodePaid || ""),
      String(nodeRemaining || ""),
      nodeCost > 0 ? `${pct}%` : "",
    ]);
  }

  // Milestones section
  rows.push([]);
  rows.push(["Payment Milestones"]);
  rows.push(["Task", "Milestone", "Amount", "Status", "Due Date", "Paid Date"]);

  for (const n of nodes) {
    for (const m of n.milestones) {
      rows.push([
        n.name,
        m.label,
        String(Number(m.amount)),
        m.status,
        m.dueDate ? new Date(m.dueDate).toLocaleDateString("en-IL") : "",
        m.paidDate ? new Date(m.paidDate).toLocaleDateString("en-IL") : "",
      ]);
    }
  }

  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${project.name.replace(/[^a-zA-Z0-9\u0590-\u05FF ]/g, "_")}_report.csv"`,
    },
  });
}

function generateWhatsApp(project: any, nodes: any[], issues: any[], budget: number, cost: number, paid: number, remaining: number) {
  const pct = cost > 0 ? Math.round((paid / cost) * 100) : 0;
  const openIssues = issues.filter((i) => i.status !== "RESOLVED");

  let text = `🏗️ *${project.name}*\n`;
  text += `📅 ${new Date().toLocaleDateString("he-IL")}\n\n`;

  text += `💰 *Budget:* ${fmtILS(budget)}\n`;
  text += `📊 *Total Cost:* ${fmtILS(cost)}\n`;
  text += `✅ *Paid:* ${fmtILS(paid)} (${pct}%)\n`;
  text += `⏳ *Remaining:* ${fmtILS(remaining)}\n`;
  text += `🏦 *Budget Left:* ${fmtILS(budget - cost)}\n\n`;

  // Group by status
  const completed = nodes.filter((n) => n.status === "COMPLETED");
  const inProgress = nodes.filter((n) => n.status === "IN_PROGRESS");
  const pending = nodes.filter((n) => !["COMPLETED", "IN_PROGRESS", "CANCELLED"].includes(n.status));

  if (inProgress.length > 0) {
    text += `🔨 *In Progress (${inProgress.length}):*\n`;
    for (const n of inProgress.slice(0, 10)) {
      const nc = Number(n.expectedCost || 0);
      text += `  • ${n.name}${nc ? ` — ${fmtILS(nc)}` : ""}${n.vendor?.name ? ` (${n.vendor.name})` : ""}\n`;
    }
    if (inProgress.length > 10) text += `  ... +${inProgress.length - 10} more\n`;
    text += "\n";
  }

  if (pending.length > 0) {
    text += `📋 *Pending (${pending.length}):*\n`;
    for (const n of pending.slice(0, 10)) {
      const nc = Number(n.expectedCost || 0);
      text += `  • ${n.name}${nc ? ` — ${fmtILS(nc)}` : ""}\n`;
    }
    if (pending.length > 10) text += `  ... +${pending.length - 10} more\n`;
    text += "\n";
  }

  if (completed.length > 0) {
    text += `✅ *Completed (${completed.length}):*\n`;
    for (const n of completed.slice(0, 5)) {
      text += `  • ${n.name}\n`;
    }
    if (completed.length > 5) text += `  ... +${completed.length - 5} more\n`;
    text += "\n";
  }

  if (openIssues.length > 0) {
    text += `⚠️ *Open Issues (${openIssues.length}):*\n`;
    for (const i of openIssues.slice(0, 5)) {
      text += `  • ${i.title}${i.node?.name ? ` — ${i.node.name}` : ""}\n`;
    }
    text += "\n";
  }

  // Upcoming payments
  const upcoming = nodes
    .flatMap((n) => n.milestones.filter((m: any) => m.status !== "PAID" && m.dueDate).map((m: any) => ({ ...m, taskName: n.name })))
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 5);

  if (upcoming.length > 0) {
    text += `📆 *Upcoming Payments:*\n`;
    for (const m of upcoming) {
      text += `  • ${m.label} (${m.taskName}) — ${fmtILS(Number(m.amount))} — ${new Date(m.dueDate).toLocaleDateString("he-IL")}\n`;
    }
  }

  return Response.json({ text, shareUrl: `https://wa.me/?text=${encodeURIComponent(text)}` });
}

function generateHtml(project: any, nodes: any[], issues: any[], budget: number, cost: number, paid: number, remaining: number) {
  const pct = cost > 0 ? Math.round((paid / cost) * 100) : 0;
  const openIssues = issues.filter((i) => i.status !== "RESOLVED");

  let html = `<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="utf-8">
<title>${project.name} — Report</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; color: #1A1714; }
  h1 { color: #B8956A; border-bottom: 3px solid #B8956A; padding-bottom: 12px; }
  h2 { color: #6B6460; margin-top: 30px; }
  .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px; margin: 20px 0; }
  .stat { background: #F5F2EE; border-radius: 12px; padding: 16px; text-align: center; }
  .stat-value { font-size: 24px; font-weight: 700; color: #1A1714; }
  .stat-label { font-size: 12px; color: #6B6460; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px; }
  th { background: #1A1714; color: #F5F2EE; padding: 10px 12px; text-align: start; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
  td { padding: 8px 12px; border-bottom: 1px solid #E8E3DD; }
  tr:hover td { background: rgba(184,149,106,0.06); }
  .paid { color: #5E8A66; font-weight: 600; }
  .remaining { color: #C4614A; font-weight: 600; }
  .status { display: inline-block; padding: 2px 8px; border-radius: 6px; font-size: 10px; font-weight: 700; }
  .COMPLETED { background: #5E8A6615; color: #5E8A66; }
  .IN_PROGRESS { background: #B8956A1A; color: #B8956A; }
  .PENDING, .NOT_STARTED { background: #E8E3DD; color: #6B6460; }
  .CANCELLED { background: #C4614A12; color: #C4614A; }
  .progress { height: 8px; background: #E8E3DD; border-radius: 4px; overflow: hidden; margin-top: 8px; }
  .progress-fill { height: 100%; background: linear-gradient(90deg, #5E8A66, #78B080); border-radius: 4px; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #E8E3DD; font-size: 11px; color: #A39E99; }
</style></head><body>
<h1>${project.name}</h1>
<p style="color:#A39E99">Generated ${new Date().toLocaleDateString("he-IL")} · Reno Tracker</p>

<div class="stats">
  <div class="stat"><div class="stat-value">${fmtILS(budget)}</div><div class="stat-label">Budget</div></div>
  <div class="stat"><div class="stat-value">${fmtILS(cost)}</div><div class="stat-label">Total Cost</div></div>
  <div class="stat"><div class="stat-value" style="color:#5E8A66">${fmtILS(paid)}</div><div class="stat-label">Paid (${pct}%)</div></div>
  <div class="stat"><div class="stat-value" style="color:#C4614A">${fmtILS(remaining)}</div><div class="stat-label">Remaining</div></div>
  <div class="stat"><div class="stat-value" style="color:${budget - cost >= 0 ? '#5E8A66' : '#C4614A'}">${fmtILS(budget - cost)}</div><div class="stat-label">Budget Left</div></div>
</div>
<div class="progress"><div class="progress-fill" style="width:${Math.min(pct, 100)}%"></div></div>

<h2>Tasks (${nodes.length})</h2>
<table>
<tr><th>Task</th><th>Parent</th><th>Category</th><th>Vendor</th><th>Rooms</th><th>Status</th><th>Cost</th><th>Paid</th><th>Left</th></tr>`;

  for (const n of nodes) {
    const nc = Number(n.expectedCost || 0);
    const np = n.milestones.filter((m: any) => m.status === "PAID").reduce((s: number, m: any) => s + Number(m.amount), 0);
    const nr = nc - np;
    const rooms = n.rooms.map((r: any) => r.room.name).join(", ");
    html += `<tr>
  <td><strong>${n.name}</strong></td>
  <td>${n.parent?.name || "—"}</td>
  <td>${n.category?.name || "—"}</td>
  <td>${n.vendor?.name || "—"}</td>
  <td>${rooms || "—"}</td>
  <td><span class="status ${n.status}">${n.status.replace(/_/g, " ")}</span></td>
  <td>${nc ? fmtILS(nc) : "—"}</td>
  <td class="paid">${np ? fmtILS(np) : "—"}</td>
  <td class="remaining">${nr > 0 ? fmtILS(nr) : "—"}</td>
</tr>`;
  }

  html += `</table>`;

  // Milestones
  const allMs = nodes.flatMap((n) => n.milestones.map((m: any) => ({ ...m, taskName: n.name })));
  if (allMs.length > 0) {
    html += `<h2>Payment Milestones (${allMs.length})</h2><table>
<tr><th>Task</th><th>Milestone</th><th>Amount</th><th>Status</th><th>Due</th><th>Paid</th></tr>`;
    for (const m of allMs) {
      html += `<tr>
  <td>${m.taskName}</td><td>${m.label}</td>
  <td>${fmtILS(Number(m.amount))}</td>
  <td><span class="status ${m.status}">${m.status}</span></td>
  <td>${m.dueDate ? new Date(m.dueDate).toLocaleDateString("he-IL") : "—"}</td>
  <td>${m.paidDate ? new Date(m.paidDate).toLocaleDateString("he-IL") : "—"}</td>
</tr>`;
    }
    html += `</table>`;
  }

  // Issues
  if (openIssues.length > 0) {
    html += `<h2>Open Issues (${openIssues.length})</h2><table>
<tr><th>Issue</th><th>Task</th><th>Status</th></tr>`;
    for (const i of openIssues) {
      html += `<tr><td>${i.title}</td><td>${i.node?.name || "—"}</td><td><span class="status ${i.status}">${i.status.replace(/_/g, " ")}</span></td></tr>`;
    }
    html += `</table>`;
  }

  html += `<div class="footer">Generated by Reno Tracker · ${new Date().toISOString()}</div></body></html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="${project.name.replace(/[^a-zA-Z0-9\u0590-\u05FF ]/g, "_")}_report.html"`,
    },
  });
}

function generateInfographic(project: any, nodes: any[], budget: number, cost: number, paid: number, remaining: number) {
  const pct = cost > 0 ? Math.round((paid / cost) * 100) : 0;
  const budgetLeft = budget - cost;
  const milestoned = nodes.flatMap((n) => n.milestones).reduce((s: number, m: any) => s + Number(m.amount), 0);
  const unscheduled = cost - milestoned;
  const pending = milestoned - paid;

  // Status counts
  const completed = nodes.filter((n) => n.status === "COMPLETED").length;
  const inProgress = nodes.filter((n) => n.status === "IN_PROGRESS").length;
  const pendingTasks = nodes.filter((n) => !["COMPLETED", "IN_PROGRESS", "CANCELLED"].includes(n.status)).length;

  // Top 5 costliest tasks
  const topTasks = [...nodes].filter((n) => n.expectedCost).sort((a, b) => Number(b.expectedCost) - Number(a.expectedCost)).slice(0, 5);

  // Donut segments
  const segments = [
    { value: paid, color: "#5E8A66", label: "Paid" },
    { value: Math.max(pending, 0), color: "#B8956A", label: "Pending" },
    { value: Math.max(unscheduled, 0), color: "#C4614A", label: "Unscheduled" },
    { value: Math.max(budgetLeft, 0), color: "#E8E3DD", label: "Budget Left" },
  ].filter(s => s.value > 0);
  const total = segments.reduce((s, seg) => s + seg.value, 0);

  // SVG donut
  const cx = 150, cy = 150, r = 100, sw = 40;
  const circ = Math.PI * 2 * r;
  let donutPaths = "";
  let offset = 0;
  for (const seg of segments) {
    const segPct = seg.value / total;
    const dash = circ * segPct;
    const gap = circ - dash;
    donutPaths += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${seg.color}" stroke-width="${sw}" stroke-dasharray="${dash} ${gap}" stroke-dashoffset="${-circ * offset + circ * 0.25}" stroke-linecap="round"/>`;
    offset += segPct;
  }

  // Legend
  let legendY = 320;
  let legendSvg = "";
  for (const seg of segments) {
    const segPct = Math.round(seg.value / total * 100);
    legendSvg += `<circle cx="80" cy="${legendY}" r="5" fill="${seg.color}"/>`;
    legendSvg += `<text x="92" y="${legendY + 4}" font-size="11" fill="#6B6460" font-family="system-ui">${seg.label}: ${fmtILS(seg.value)} (${segPct}%)</text>`;
    legendY += 22;
  }

  // Top tasks
  let tasksSvg = "";
  let ty = 80;
  for (const t of topTasks) {
    const nc = Number(t.expectedCost);
    const np = t.milestones.filter((m: any) => m.status === "PAID").reduce((s: number, m: any) => s + Number(m.amount), 0);
    const tpct = nc > 0 ? Math.round((np / nc) * 100) : 0;
    const barW = 280 * (tpct / 100);
    tasksSvg += `<text x="420" y="${ty}" font-size="11" fill="#1A1714" font-family="system-ui" font-weight="600">${t.name.slice(0, 30)}</text>`;
    tasksSvg += `<rect x="420" y="${ty + 6}" width="280" height="6" rx="3" fill="#E8E3DD"/>`;
    tasksSvg += `<rect x="420" y="${ty + 6}" width="${barW}" height="6" rx="3" fill="#5E8A66"/>`;
    tasksSvg += `<text x="710" y="${ty}" font-size="10" fill="#6B6460" font-family="system-ui" text-anchor="end">${fmtILS(np)} / ${fmtILS(nc)} (${tpct}%)</text>`;
    ty += 36;
  }

  const date = new Date().toLocaleDateString("he-IL");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#F5F2EE" rx="16"/>

  <!-- Header -->
  <text x="60" y="48" font-size="28" font-weight="700" fill="#1A1714" font-family="system-ui">${project.name}</text>
  <text x="60" y="68" font-size="12" fill="#A39E99" font-family="system-ui">${date} · Reno Tracker</text>

  <!-- Donut -->
  <g transform="translate(0, 60)">${donutPaths}</g>
  <text x="${cx}" y="${cy + 55}" font-size="28" font-weight="700" fill="#1A1714" font-family="system-ui" text-anchor="middle">${pct}%</text>
  <text x="${cx}" y="${cy + 74}" font-size="11" fill="#6B6460" font-family="system-ui" text-anchor="middle">paid</text>

  <!-- Legend -->
  ${legendSvg}

  <!-- Stats row -->
  <rect x="340" y="100" width="1" height="400" fill="#E8E3DD"/>

  <text x="420" y="48" font-size="11" font-weight="700" fill="#B8956A" font-family="system-ui" letter-spacing="1.5" text-transform="uppercase">FINANCIAL SUMMARY</text>

  <rect x="380" y="100" width="190" height="70" rx="10" fill="white"/>
  <text x="395" y="124" font-size="10" fill="#6B6460" font-family="system-ui">Budget</text>
  <text x="395" y="150" font-size="20" font-weight="700" fill="#1A1714" font-family="system-ui">${fmtILS(budget)}</text>

  <rect x="580" y="100" width="190" height="70" rx="10" fill="white"/>
  <text x="595" y="124" font-size="10" fill="#6B6460" font-family="system-ui">Paid</text>
  <text x="595" y="150" font-size="20" font-weight="700" fill="#5E8A66" font-family="system-ui">${fmtILS(paid)}</text>

  <rect x="780" y="100" width="190" height="70" rx="10" fill="white"/>
  <text x="795" y="124" font-size="10" fill="#6B6460" font-family="system-ui">Remaining</text>
  <text x="795" y="150" font-size="20" font-weight="700" fill="#C4614A" font-family="system-ui">${fmtILS(remaining)}</text>

  <rect x="980" y="100" width="190" height="70" rx="10" fill="white"/>
  <text x="995" y="124" font-size="10" fill="#6B6460" font-family="system-ui">Budget Left</text>
  <text x="995" y="150" font-size="20" font-weight="700" fill="${budgetLeft >= 0 ? '#5E8A66' : '#C4614A'}" font-family="system-ui">${fmtILS(budgetLeft)}</text>

  <!-- Progress bar -->
  <rect x="380" y="185" width="790" height="8" rx="4" fill="#E8E3DD"/>
  <rect x="380" y="185" width="${790 * Math.min(pct, 100) / 100}" height="8" rx="4" fill="#5E8A66"/>

  <!-- Task status -->
  <text x="380" y="220" font-size="10" fill="#6B6460" font-family="system-ui">${completed} completed · ${inProgress} in progress · ${pendingTasks} pending · ${nodes.length} total tasks</text>

  <!-- Top tasks -->
  <text x="420" y="256" font-size="11" font-weight="700" fill="#B8956A" font-family="system-ui" letter-spacing="1.5">TOP TASKS</text>
  <g transform="translate(0, 190)">${tasksSvg}</g>

  <!-- Footer -->
  <line x1="60" y1="600" x2="1140" y2="600" stroke="#E8E3DD"/>
  <text x="60" y="620" font-size="10" fill="#A39E99" font-family="system-ui">Generated by Reno Tracker · reno-tracker-rho.vercel.app</text>
</svg>`;

  return new Response(svg, {
    headers: { "Content-Type": "image/svg+xml", "Cache-Control": "no-cache" },
  });
}
