import { google } from "googleapis";
import { prisma } from "@/lib/prisma";
import { requireUser, requireProjectAccess } from "@/lib/dal";
import { handleError } from "@/lib/api";
import { getGoogleAuth } from "@/lib/google-api";

/* ───────────────── Translation dictionary ───────────────── */

const exportDict: Record<string, { en: string; he: string }> = {
  task: { en: "Task", he: "משימה" },
  parent: { en: "Parent", he: "משימת אב" },
  category: { en: "Category", he: "קטגוריה" },
  vendor: { en: "Vendor", he: "ספק" },
  rooms: { en: "Rooms", he: "חדרים" },
  status: { en: "Status", he: "סטטוס" },
  cost: { en: "Cost", he: "עלות" },
  paid: { en: "Paid", he: "שולם" },
  remaining: { en: "Remaining", he: "נותר" },
  pct: { en: "%", he: "%" },
  payment: { en: "Payment", he: "תשלום" },
  amount: { en: "Amount", he: "סכום" },
  dueDate: { en: "Due Date", he: "תאריך יעד" },
  paidDate: { en: "Paid Date", he: "תאריך תשלום" },
  tasks: { en: "Tasks", he: "משימות" },
  payments: { en: "Payments", he: "תשלומים" },
  report: { en: "Report", he: "דוח" },
};

type Lang = "en" | "he";

function et(key: string, lang: Lang) {
  return exportDict[key]?.[lang] || key;
}

function fmtDate(d: Date | string, lang: Lang) {
  const locale = lang === "he" ? "he-IL" : "en-IL";
  return new Date(d).toLocaleDateString(locale);
}

/* ───────────────── GET handler ───────────────── */

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await requireUser();
    const { id } = await params;
    await requireProjectAccess(userId, id);

    const { searchParams } = new URL(request.url);
    const lang: Lang = searchParams.get("lang") === "he" ? "he" : "en";

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

    // ── Get Google auth ──
    let auth;
    try {
      auth = await getGoogleAuth(userId);
    } catch {
      return Response.json(
        { error: "google_auth_required", message: "Please sign out and sign in again to grant Google Sheets access." },
        { status: 401 }
      );
    }

    const sheets = google.sheets({ version: "v4", auth });
    const date = fmtDate(new Date(), lang);
    const title = `${project.name} — ${et("report", lang)} ${date}`;

    // ── Create spreadsheet ──
    const spreadsheet = await sheets.spreadsheets.create({
      requestBody: {
        properties: {
          title,
          locale: lang === "he" ? "iw_IL" : "en_US",
        },
        sheets: [
          { properties: { title: et("tasks", lang), sheetId: 0 } },
          { properties: { title: et("payments", lang), sheetId: 1 } },
        ],
      },
    });

    const spreadsheetId = spreadsheet.data.spreadsheetId!;

    // ── Populate Tasks sheet ──
    const taskHeaders = [
      et("task", lang), et("parent", lang), et("category", lang), et("vendor", lang),
      et("rooms", lang), et("status", lang), et("cost", lang), et("paid", lang),
      et("remaining", lang), et("pct", lang),
    ];

    const taskRows = nodes.map((n) => {
      const nodePaid = n.milestones.filter((m) => m.status === "PAID").reduce((s, m) => s + Number(m.amount), 0);
      const nodeCost = Number(n.expectedCost || 0);
      const nodeRemaining = nodeCost - nodePaid;
      const pct = nodeCost > 0 ? Math.round((nodePaid / nodeCost) * 100) : 0;
      const rooms = n.rooms.map((r: any) => r.room.name).join(", ");

      return [
        n.name,
        n.parent?.name || "",
        n.category?.name || "",
        n.vendor?.name || "",
        rooms,
        n.status,
        nodeCost || "",
        nodePaid || "",
        nodeRemaining || "",
        nodeCost > 0 ? `${pct}%` : "",
      ];
    });

    // ── Populate Payments sheet ──
    const paymentHeaders = [
      et("task", lang), et("payment", lang), et("amount", lang),
      et("status", lang), et("dueDate", lang), et("paidDate", lang),
    ];

    const paymentRows: (string | number)[][] = [];
    for (const n of nodes) {
      for (const m of n.milestones) {
        paymentRows.push([
          n.name,
          m.label,
          Number(m.amount),
          m.status,
          m.dueDate ? fmtDate(m.dueDate, lang) : "",
          m.paidDate ? fmtDate(m.paidDate, lang) : "",
        ]);
      }
    }

    // ── Batch update values ──
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: "USER_ENTERED",
        data: [
          {
            range: `'${et("tasks", lang)}'!A1`,
            values: [taskHeaders, ...taskRows],
          },
          {
            range: `'${et("payments", lang)}'!A1`,
            values: [paymentHeaders, ...paymentRows],
          },
        ],
      },
    });

    // ── Style headers + format currency columns ──
    const taskHeaderColor = { red: 0.1, green: 0.09, blue: 0.08 }; // dark
    const taskHeaderTextColor = { red: 0.96, green: 0.95, blue: 0.93 }; // light

    const styleRequests = [
      // Tasks header row styling
      {
        repeatCell: {
          range: { sheetId: 0, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 10 },
          cell: {
            userEnteredFormat: {
              backgroundColor: taskHeaderColor,
              textFormat: { bold: true, foregroundColor: taskHeaderTextColor, fontSize: 10 },
              horizontalAlignment: "CENTER",
            },
          },
          fields: "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)",
        },
      },
      // Payments header row styling
      {
        repeatCell: {
          range: { sheetId: 1, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 6 },
          cell: {
            userEnteredFormat: {
              backgroundColor: taskHeaderColor,
              textFormat: { bold: true, foregroundColor: taskHeaderTextColor, fontSize: 10 },
              horizontalAlignment: "CENTER",
            },
          },
          fields: "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)",
        },
      },
      // Tasks: Cost column (G = index 6) number format
      {
        repeatCell: {
          range: { sheetId: 0, startRowIndex: 1, endRowIndex: taskRows.length + 1, startColumnIndex: 6, endColumnIndex: 7 },
          cell: { userEnteredFormat: { numberFormat: { type: "NUMBER", pattern: "#,##0" } } },
          fields: "userEnteredFormat.numberFormat",
        },
      },
      // Tasks: Paid column (H = index 7) number format
      {
        repeatCell: {
          range: { sheetId: 0, startRowIndex: 1, endRowIndex: taskRows.length + 1, startColumnIndex: 7, endColumnIndex: 8 },
          cell: { userEnteredFormat: { numberFormat: { type: "NUMBER", pattern: "#,##0" } } },
          fields: "userEnteredFormat.numberFormat",
        },
      },
      // Tasks: Remaining column (I = index 8) number format
      {
        repeatCell: {
          range: { sheetId: 0, startRowIndex: 1, endRowIndex: taskRows.length + 1, startColumnIndex: 8, endColumnIndex: 9 },
          cell: { userEnteredFormat: { numberFormat: { type: "NUMBER", pattern: "#,##0" } } },
          fields: "userEnteredFormat.numberFormat",
        },
      },
      // Payments: Amount column (C = index 2) number format
      {
        repeatCell: {
          range: { sheetId: 1, startRowIndex: 1, endRowIndex: paymentRows.length + 1, startColumnIndex: 2, endColumnIndex: 3 },
          cell: { userEnteredFormat: { numberFormat: { type: "NUMBER", pattern: "#,##0" } } },
          fields: "userEnteredFormat.numberFormat",
        },
      },
      // Auto-resize columns for Tasks
      { autoResizeDimensions: { dimensions: { sheetId: 0, dimension: "COLUMNS", startIndex: 0, endIndex: 10 } } },
      // Auto-resize columns for Payments
      { autoResizeDimensions: { dimensions: { sheetId: 1, dimension: "COLUMNS", startIndex: 0, endIndex: 6 } } },
      // Freeze header row in Tasks
      { updateSheetProperties: { properties: { sheetId: 0, gridProperties: { frozenRowCount: 1 } }, fields: "gridProperties.frozenRowCount" } },
      // Freeze header row in Payments
      { updateSheetProperties: { properties: { sheetId: 1, gridProperties: { frozenRowCount: 1 } }, fields: "gridProperties.frozenRowCount" } },
    ];

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: styleRequests },
    });

    const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
    return Response.json({ url });
  } catch (err: any) {
    console.error("export-sheets error:", err);
    const message = err?.message || "Export failed";
    const isGoogleError = message.includes("insufficient") || message.includes("token") || message.includes("auth") || message.includes("credentials") || err?.code === 401 || err?.code === 403;
    if (isGoogleError) {
      return Response.json({ error: "google_auth_required", message: "Please sign out and sign in again to grant Google Sheets access." }, { status: 401 });
    }
    return Response.json({ error: "export_failed", message }, { status: 500 });
  }
}
