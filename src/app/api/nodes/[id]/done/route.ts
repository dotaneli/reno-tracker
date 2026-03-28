import { prisma } from "@/lib/prisma";
import { requireUser, requireNodeAccess } from "@/lib/dal";
import { json, handleError } from "@/lib/api";
import { logAction } from "@/lib/actionlog";

// POST /api/nodes/:id/done — mark task as completed, pay all unpaid milestones
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await requireUser();
    const { id } = await params;
    const { projectId } = await requireNodeAccess(userId, id, ["OWNER", "EDITOR"]);

    const now = new Date();

    // Get current state for undo
    const oldNode = await prisma.projectNode.findUnique({ where: { id } });
    const oldMilestones = await prisma.paymentMilestone.findMany({ where: { nodeId: id, status: { not: "PAID" } } });

    // Mark node as completed
    const node = await prisma.projectNode.update({
      where: { id },
      data: { status: "COMPLETED", completedDate: now },
    });

    // Mark all unpaid milestones as paid
    const paidIds: string[] = [];
    for (const m of oldMilestones) {
      await prisma.paymentMilestone.update({
        where: { id: m.id },
        data: { status: "PAID", paidDate: now },
      });
      paidIds.push(m.id);
    }

    // Log as a batch action for undo
    const batchOld = [
      { action: "UPDATE", entity: "node", entityId: id, oldData: oldNode, newData: node },
      ...oldMilestones.map((m) => ({
        action: "UPDATE", entity: "milestone", entityId: m.id,
        oldData: m, newData: { ...m, status: "PAID", paidDate: now },
      })),
    ];
    const batchNew = batchOld.map((a: any) => ({ ...a, oldData: a.newData, newData: a.oldData }));

    await logAction(projectId, userId, "BATCH", "node", id, batchOld, batchNew);

    return json({ completed: true, milestonePaid: paidIds.length });
  } catch (err) {
    return handleError(err);
  }
}
