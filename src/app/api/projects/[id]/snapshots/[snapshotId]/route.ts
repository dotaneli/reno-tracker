import { prisma } from "@/lib/prisma";
import { requireUser, requireProjectAccess } from "@/lib/dal";
import { json, errorResponse, handleError } from "@/lib/api";
import { captureProjectState, restoreProjectState } from "@/lib/snapshots";

// POST /api/projects/:id/snapshots/:snapshotId — rollback to this version
// Auto-checkpoints current state first so nothing is lost
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; snapshotId: string }> }
) {
  try {
    const { userId } = await requireUser();
    const { id, snapshotId } = await params;
    await requireProjectAccess(userId, id, ["OWNER"]);

    // Find the target snapshot
    const target = await prisma.projectSnapshot.findUnique({
      where: { id: snapshotId },
    });
    if (!target || target.projectId !== id) {
      return errorResponse("Snapshot not found", 404);
    }

    // Auto-checkpoint current state before rollback
    const currentState = await captureProjectState(id);
    await prisma.projectSnapshot.create({
      data: {
        label: `Auto-save before rollback to "${target.label}"`,
        data: currentState as any,
        projectId: id,
        authorId: userId,
      },
    });

    // Restore from target snapshot
    await restoreProjectState(id, target.data);

    return json({ success: true, restoredTo: target.label });
  } catch (err) {
    return handleError(err);
  }
}

// DELETE /api/projects/:id/snapshots/:snapshotId — delete a snapshot (OWNER only)
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; snapshotId: string }> }
) {
  try {
    const { userId } = await requireUser();
    const { id, snapshotId } = await params;
    await requireProjectAccess(userId, id, ["OWNER"]);

    await prisma.projectSnapshot.delete({ where: { id: snapshotId } });
    return new Response(null, { status: 204 });
  } catch (err) {
    return handleError(err);
  }
}
