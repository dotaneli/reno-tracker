import { prisma } from "@/lib/prisma";
import { requireUser, requireNodeAccess } from "@/lib/dal";
import { json, handleError } from "@/lib/api";
import { logAction } from "@/lib/actionlog";
import { put } from "@vercel/blob";
import { isBase64Upload, uploadBase64File } from "@/lib/file-upload";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; milestoneId: string }> }) {
  try {
    const { userId } = await requireUser();
    const { id, milestoneId } = await params;
    const { projectId } = await requireNodeAccess(userId, id, ["OWNER", "EDITOR"]);

    const oldMs = await prisma.paymentMilestone.findUnique({ where: { id: milestoneId } });

    let label: string | null = null;
    let amountStr: string | null = null;
    let dueDate: string | null = null;
    let paidDate: string | null = null;
    let status: string | null = null;
    let receiptUrl: string | undefined;
    let receiptName: string | undefined;

    if (isBase64Upload(request)) {
      const body = await request.json();
      label = body.label ?? null;
      amountStr = body.amount != null ? String(body.amount) : null;
      dueDate = body.dueDate !== undefined ? body.dueDate : null;
      paidDate = body.paidDate !== undefined ? body.paidDate : null;
      status = body.status ?? null;
      if (body.receiptBase64 && body.receiptFileName) {
        const result = await uploadBase64File(body.receiptFileName, body.receiptBase64, `receipts/${id}`);
        receiptUrl = result.url;
        receiptName = result.name;
      }
    } else {
      const fd = await request.formData();
      label = fd.get("label") as string | null;
      amountStr = fd.get("amount") as string | null;
      dueDate = fd.get("dueDate") as string | null;
      paidDate = fd.get("paidDate") as string | null;
      status = fd.get("status") as string | null;
      const file = fd.get("receipt") as File | null;
      if (file && file.size > 0) {
        const blob = await put(`receipts/${id}/${file.name}`, file, { access: "public" });
        receiptUrl = blob.url; receiptName = file.name;
      }
    }

    const m = await prisma.paymentMilestone.update({
      where: { id: milestoneId },
      data: {
        ...(label !== null && { label: label.trim() }),
        ...(amountStr !== null && { amount: Number(amountStr) }),
        ...(dueDate !== null && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(paidDate !== null && { paidDate: paidDate ? new Date(paidDate) : null }),
        ...(status !== null && { status: status as any }),
        ...(receiptUrl && { receiptUrl, receiptName }),
      },
    });
    await logAction(projectId, userId, "UPDATE", "milestone", milestoneId, oldMs, m);
    return json(m);
  } catch (err) { return handleError(err); }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; milestoneId: string }> }) {
  try {
    const { userId } = await requireUser();
    const { id, milestoneId } = await params;
    const { projectId } = await requireNodeAccess(userId, id, ["OWNER", "EDITOR"]);
    const oldMs = await prisma.paymentMilestone.findUnique({ where: { id: milestoneId } });
    await prisma.paymentMilestone.delete({ where: { id: milestoneId } });
    if (oldMs) await logAction(projectId, userId, "DELETE", "milestone", milestoneId, oldMs, null);
    return new Response(null, { status: 204 });
  } catch (err) { return handleError(err); }
}
