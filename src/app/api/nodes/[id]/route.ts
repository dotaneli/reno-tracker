import { prisma } from "@/lib/prisma";
import { requireUser, requireNodeAccess } from "@/lib/dal";
import { json, errorResponse, handleError, parseBody, type NodeUpdateBody } from "@/lib/api";
import { logAction } from "@/lib/actionlog";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await requireUser();
    const { id } = await params;
    await requireNodeAccess(userId, id);

    const node = await prisma.projectNode.findUnique({
      where: { id },
      include: {
        rooms: { include: { room: true } },
        vendor: true,
        children: {
          include: { vendor: true, category: true, rooms: { include: { room: true } }, _count: { select: { children: true, milestones: true, receipts: true, notes: true, issues: true } } },
          orderBy: { sortOrder: "asc" },
        },
        milestones: { orderBy: { dueDate: "asc" } },
        receipts: { orderBy: { uploadedAt: "desc" } },
        notes: { include: { author: { select: { id: true, name: true, image: true } } }, orderBy: { createdAt: "desc" } },
        issues: true,
      },
    });
    return json(node);
  } catch (err) { return handleError(err); }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await requireUser();
    const { id } = await params;
    const { projectId } = await requireNodeAccess(userId, id, ["OWNER", "EDITOR"]);

    // Capture old state for undo
    const oldNode = await prisma.projectNode.findUnique({ where: { id } });

    const body = await parseBody<NodeUpdateBody>(request);

    // Prevent circular parent reference
    if (body.parentId !== undefined && body.parentId !== null) {
      let cur: string | null = body.parentId;
      while (cur) {
        if (cur === id) return errorResponse("Circular parent reference", 400);
        const parent: { parentId: string | null } | null = await prisma.projectNode.findUnique({ where: { id: cur }, select: { parentId: true } });
        cur = parent?.parentId ?? null;
      }
    }

    // Validate vendorId/categoryId belong to the same project
    if (body.vendorId) {
      const vendor = await prisma.vendor.findUnique({ where: { id: body.vendorId }, select: { projectId: true } });
      if (!vendor || vendor.projectId !== projectId) return errorResponse("Invalid vendorId", 400);
    }
    if (body.categoryId) {
      const cat = await prisma.category.findUnique({ where: { id: body.categoryId }, select: { projectId: true } });
      if (!cat || cat.projectId !== projectId) return errorResponse("Invalid categoryId", 400);
    }

    // Guard: prevent double-counting — no cost on nodes with costed children (or vice versa)
    if (body.expectedCost !== undefined && body.expectedCost !== null) {
      // Check if this node has children with costs
      const childrenWithCost = await prisma.projectNode.count({
        where: { parentId: id, expectedCost: { not: null } },
      });
      if (childrenWithCost > 0) {
        return errorResponse("Cannot set cost on a task that has sub-tasks with costs — this would double-count. Set costs on individual sub-tasks instead.", 400);
      }
      // Check if parent already has cost
      if (oldNode?.parentId) {
        const parent = await prisma.projectNode.findUnique({ where: { id: oldNode.parentId }, select: { expectedCost: true } });
        if (parent?.expectedCost) {
          return errorResponse("Cannot set cost on a sub-task when the parent task already has a cost. Remove the parent's cost first.", 400);
        }
      }
    }

    // Replace room links if provided — validate project scope first
    if (body.roomIds) {
      if (body.roomIds.length > 0) {
        const validRooms = await prisma.room.findMany({
          where: { id: { in: body.roomIds }, floor: { projectId } },
          select: { id: true },
        });
        if (validRooms.length !== body.roomIds.length) return errorResponse("One or more roomIds are invalid for this project", 400);
      }
      await prisma.nodeRoom.deleteMany({ where: { nodeId: id } });
      if (body.roomIds.length > 0) {
        await prisma.nodeRoom.createMany({ data: body.roomIds.map(roomId => ({ nodeId: id, roomId })) });
      }
    }

    const node = await prisma.projectNode.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name.trim() }),
        ...(body.parentId !== undefined && { parentId: body.parentId }),
        ...(body.nodeType !== undefined && { nodeType: body.nodeType as any }),
        ...(body.categoryId !== undefined && { categoryId: body.categoryId }),
        ...(body.vendorId !== undefined && { vendorId: body.vendorId }),
        ...(body.expectedCost !== undefined && { expectedCost: body.expectedCost }),
        ...(body.actualCost !== undefined && { actualCost: body.actualCost }),
        ...(body.status !== undefined && { status: body.status as any }),
        ...(body.startDate !== undefined && { startDate: body.startDate ? new Date(body.startDate) : null }),
        ...(body.endDate !== undefined && { endDate: body.endDate ? new Date(body.endDate) : null }),
        ...(body.expectedDate !== undefined && { expectedDate: body.expectedDate ? new Date(body.expectedDate) : null }),
        ...(body.completedDate !== undefined && { completedDate: body.completedDate ? new Date(body.completedDate) : null }),
        ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
      },
      include: { rooms: { include: { room: true } }, vendor: true, category: true },
    });

    await logAction(projectId, userId, "UPDATE", "node", id, oldNode, node);
    return json(node);
  } catch (err) { return handleError(err); }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await requireUser();
    const { id } = await params;
    const { projectId } = await requireNodeAccess(userId, id, ["OWNER", "EDITOR"]);
    const oldNode = await prisma.projectNode.findUnique({ where: { id } });
    await prisma.projectNode.delete({ where: { id } });
    if (oldNode) await logAction(projectId, userId, "DELETE", "node", id, oldNode, null);
    return new Response(null, { status: 204 });
  } catch (err) { return handleError(err); }
}
