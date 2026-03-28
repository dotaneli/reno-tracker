import { prisma } from "@/lib/prisma";
import { requireUser, requireProjectAccess } from "@/lib/dal";
import { json, handleError } from "@/lib/api";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await requireUser();
    const { id } = await params;
    await requireProjectAccess(userId, id);

    const milestones = await prisma.paymentMilestone.findMany({
      where: { node: { projectId: id } },
      include: { node: { select: { id: true, name: true, nodeType: true, parentId: true, parent: { select: { name: true } } } } },
      orderBy: { dueDate: "asc" },
    });

    const result = milestones.map((m) => ({
      id: m.id, label: m.label, amount: m.amount, percentage: m.percentage,
      dueDate: m.dueDate, paidDate: m.paidDate, status: m.status,
      receiptUrl: m.receiptUrl, receiptName: m.receiptName,
      nodeId: m.node.id, nodeName: m.node.name, nodeType: m.node.nodeType,
      parentName: m.node.parent?.name || null,
    }));
    return json(result);
  } catch (err) { return handleError(err); }
}
