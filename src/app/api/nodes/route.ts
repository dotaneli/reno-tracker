import { prisma } from "@/lib/prisma";
import { requireUser, requireProjectAccess, requireNodeAccess, getUserProjectIds } from "@/lib/dal";
import { json, errorResponse, handleError, parseBody, type NodeCreateBody } from "@/lib/api";
import { logAction } from "@/lib/actionlog";

export async function GET(request: Request) {
  try {
    const { userId } = await requireUser();
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const parentId = searchParams.get("parentId"); // "null" for roots, or an ID

    if (projectId) await requireProjectAccess(userId, projectId);
    const projectIds = projectId ? [projectId] : await getUserProjectIds(userId);

    const tree = searchParams.get("tree") === "true";

    if (tree) {
      // Return full nested tree — fetch all flat, build tree in memory
      const allNodes = await prisma.projectNode.findMany({
        where: { projectId: { in: projectIds } },
        include: {
          rooms: { include: { room: true } },
          vendor: true,
          category: true,
          milestones: { select: { amount: true, status: true } },
          _count: { select: { children: true, milestones: true, receipts: true, notes: true, issues: true } },
        },
        orderBy: { sortOrder: "asc" },
      });

      // Build tree with payment summaries
      const nodeMap = new Map<string, any>();
      for (const n of allNodes) {
        const paid = n.milestones.filter((m: any) => m.status === "PAID").reduce((s: number, m: any) => s + Number(m.amount), 0);
        const totalMs = n.milestones.reduce((s: number, m: any) => s + Number(m.amount), 0);
        nodeMap.set(n.id, { ...n, milestones: undefined, _paid: paid, _totalMilestoned: totalMs, children: [] });
      }
      const roots: any[] = [];
      for (const n of allNodes) {
        const node = nodeMap.get(n.id)!;
        if (n.parentId && nodeMap.has(n.parentId)) {
          nodeMap.get(n.parentId)!.children.push(node);
        } else {
          roots.push(node);
        }
      }
      return json(roots);
    }

    // Flat mode
    const where: any = { projectId: { in: projectIds } };
    if (parentId === "null" || parentId === "root") where.parentId = null;
    else if (parentId) where.parentId = parentId;

    const nodes = await prisma.projectNode.findMany({
      where,
      include: {
        rooms: { include: { room: true } },
        vendor: true,
        category: true,
        milestones: { select: { amount: true, status: true } },
        children: { include: { vendor: true, category: true, _count: { select: { children: true, milestones: true, receipts: true, notes: true, issues: true } } }, orderBy: { sortOrder: "asc" } },
        _count: { select: { children: true, milestones: true, receipts: true, notes: true, issues: true } },
      },
      orderBy: { sortOrder: "asc" },
    });

    // Add _paid and _totalMilestoned (same as tree mode) so TaskLine can show payment status
    const result = nodes.map((n) => {
      const paid = n.milestones.filter((m: any) => m.status === "PAID").reduce((s: number, m: any) => s + Number(m.amount), 0);
      const totalMs = n.milestones.reduce((s: number, m: any) => s + Number(m.amount), 0);
      return { ...n, milestones: undefined, _paid: paid, _totalMilestoned: totalMs };
    });
    return json(result);
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const { userId } = await requireUser();
    const body = await parseBody<NodeCreateBody>(request);

    if (!body.name?.trim()) return errorResponse("name is required", 400);
    if (!body.projectId?.trim()) return errorResponse("projectId is required", 400);

    await requireProjectAccess(userId, body.projectId, ["OWNER", "EDITOR"]);

    // If parentId provided, verify it exists and belongs to same project
    if (body.parentId) {
      const parent = await prisma.projectNode.findUnique({ where: { id: body.parentId }, select: { projectId: true } });
      if (!parent || parent.projectId !== body.projectId) return errorResponse("Invalid parentId", 400);
    }

    const node = await prisma.projectNode.create({
      data: {
        name: body.name.trim(),
        projectId: body.projectId,
        parentId: body.parentId || null,
        nodeType: body.nodeType as any || null,
        categoryId: body.categoryId || null,
        vendorId: body.vendorId || null,
        expectedCost: body.expectedCost,
        actualCost: body.actualCost,
        status: (body.status as any) || undefined,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        endDate: body.endDate ? new Date(body.endDate) : undefined,
        expectedDate: body.expectedDate ? new Date(body.expectedDate) : undefined,
        rooms: body.roomIds?.length ? { create: body.roomIds.map(roomId => ({ roomId })) } : undefined,
      },
      include: { rooms: { include: { room: true } }, vendor: true, category: true, children: true },
    });

    await logAction(body.projectId, userId, "CREATE", "node", node.id, null, node);
    return json(node, 201);
  } catch (err) { return handleError(err); }
}
