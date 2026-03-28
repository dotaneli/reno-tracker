import { prisma } from "@/lib/prisma";
import { requireUser, requireNodeAccess } from "@/lib/dal";
import { json, errorResponse, handleError } from "@/lib/api";
import { logAction } from "@/lib/actionlog";
import { put } from "@vercel/blob";
import { isBase64Upload, uploadBase64File } from "@/lib/file-upload";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await requireUser();
    const { id } = await params;
    await requireNodeAccess(userId, id);
    const milestones = await prisma.paymentMilestone.findMany({ where: { nodeId: id }, orderBy: { dueDate: "asc" } });
    return json(milestones);
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await requireUser();
    const { id } = await params;
    await requireNodeAccess(userId, id, ["OWNER", "EDITOR"]);

    let label: string;
    let amountStr: string | null = null;
    let percentage: string | null = null;
    let dueDate: string | null = null;
    let status: string = "PENDING";
    let receiptUrl: string | undefined;
    let receiptName: string | undefined;

    if (isBase64Upload(request)) {
      // JSON body (LLM agent path)
      const body = await request.json();
      label = body.label;
      amountStr = body.amount != null ? String(body.amount) : null;
      percentage = body.percentage != null ? String(body.percentage) : null;
      dueDate = body.dueDate || null;
      status = body.status || "PENDING";
      if (body.receiptBase64 && body.receiptFileName) {
        const result = await uploadBase64File(body.receiptFileName, body.receiptBase64, `receipts/${id}`);
        receiptUrl = result.url;
        receiptName = result.name;
      }
    } else {
      // FormData (browser path)
      const formData = await request.formData();
      label = formData.get("label") as string;
      amountStr = formData.get("amount") as string | null;
      percentage = formData.get("percentage") as string | null;
      dueDate = formData.get("dueDate") as string | null;
      status = (formData.get("status") as string) || "PENDING";
      const file = formData.get("receipt") as File | null;
      if (file && file.size > 0) {
        const blob = await put(`receipts/${id}/${file.name}`, file, { access: "public" });
        receiptUrl = blob.url;
        receiptName = file.name;
      }
    }

    if (!label?.trim()) return errorResponse("label is required", 400);

    let amount: number;
    let pct: number | null = null;

    if (percentage && Number(percentage) > 0) {
      pct = Number(percentage);
      const node = await prisma.projectNode.findUnique({ where: { id }, select: { expectedCost: true } });
      if (!node?.expectedCost) return errorResponse("Node has no expected cost — cannot use percentage", 400);
      amount = (pct / 100) * Number(node.expectedCost);
    } else if (amountStr && Number(amountStr) > 0) {
      amount = Number(amountStr);
    } else {
      return errorResponse("amount or percentage is required", 400);
    }

    const node = await prisma.projectNode.findUnique({ where: { id }, select: { projectId: true } });
    const milestone = await prisma.paymentMilestone.create({
      data: { label: label.trim(), amount, percentage: pct, dueDate: dueDate ? new Date(dueDate) : undefined, status: status as any, receiptUrl, receiptName, nodeId: id },
    });
    if (node) await logAction(node.projectId, userId, "CREATE", "milestone", milestone.id, null, milestone);
    return json(milestone, 201);
  } catch (err) { return handleError(err); }
}
