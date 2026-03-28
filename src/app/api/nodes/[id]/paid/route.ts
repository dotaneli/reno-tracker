import { prisma } from "@/lib/prisma";
import { requireUser, requireNodeAccess } from "@/lib/dal";
import { json, handleError } from "@/lib/api";
import { logAction } from "@/lib/actionlog";

/**
 * POST /api/nodes/:id/paid — Quick "mark as paid"
 * Creates a single payment for the remaining unpaid cost and marks it PAID.
 * If milestones already exist, only pays the gap between cost and paid milestones.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await requireUser();
    const { id } = await params;
    const { projectId } = await requireNodeAccess(userId, id, ["OWNER", "EDITOR"]);

    const node = await prisma.projectNode.findUnique({
      where: { id },
      include: { milestones: true },
    });
    if (!node || !node.expectedCost) {
      return json({ error: "Node has no expected cost" }, 400);
    }

    const cost = Number(node.expectedCost);
    const alreadyPaid = node.milestones
      .filter((m) => m.status === "PAID")
      .reduce((s, m) => s + Number(m.amount), 0);
    const remaining = cost - alreadyPaid;

    if (remaining <= 0) {
      return json({ alreadyFullyPaid: true, paid: alreadyPaid });
    }

    const now = new Date();

    // Also mark any PENDING/DUE milestones as PAID
    const unpaidMilestones = node.milestones.filter((m) => m.status !== "PAID");
    for (const m of unpaidMilestones) {
      await prisma.paymentMilestone.update({
        where: { id: m.id },
        data: { status: "PAID", paidDate: now },
      });
    }

    // If there's still a gap (cost not fully covered by milestones), create one
    const totalMilestoned = node.milestones.reduce((s, m) => s + Number(m.amount), 0);
    const gap = cost - totalMilestoned;
    let newMilestone = null;

    if (gap > 0) {
      newMilestone = await prisma.paymentMilestone.create({
        data: {
          label: "Payment",
          amount: gap,
          status: "PAID",
          paidDate: now,
          nodeId: id,
        },
      });
    }

    await logAction(projectId, userId, "BATCH", "node", id,
      { status: node.status, milestones: node.milestones },
      { action: "markPaid", milestonesMarkedPaid: unpaidMilestones.length, gapPaymentCreated: gap > 0, gapAmount: gap }
    );

    return json({
      paid: true,
      totalPaid: cost,
      milestonesMarkedPaid: unpaidMilestones.length,
      gapPaymentCreated: newMilestone ? { id: newMilestone.id, amount: gap } : null,
    });
  } catch (err) {
    return handleError(err);
  }
}
