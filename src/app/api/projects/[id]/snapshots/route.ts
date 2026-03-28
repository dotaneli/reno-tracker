import { prisma } from "@/lib/prisma";
import { requireUser, requireProjectAccess } from "@/lib/dal";
import { json, errorResponse, handleError, parseBody } from "@/lib/api";
import { captureProjectState } from "@/lib/snapshots";

// GET /api/projects/:id/snapshots — list all versions
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requireUser();
    const { id } = await params;
    await requireProjectAccess(userId, id);

    const snapshots = await prisma.projectSnapshot.findMany({
      where: { projectId: id },
      include: {
        author: { select: { id: true, name: true, image: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return json(snapshots);
  } catch (err) {
    return handleError(err);
  }
}

// POST /api/projects/:id/snapshots — create a checkpoint
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requireUser();
    const { id } = await params;
    await requireProjectAccess(userId, id, ["OWNER", "EDITOR"]);

    const body = await parseBody<{ label: string }>(request);
    if (!body.label?.trim()) return errorResponse("label is required", 400);

    const data = await captureProjectState(id);

    const snapshot = await prisma.projectSnapshot.create({
      data: {
        label: body.label.trim(),
        data: data as any,
        projectId: id,
        authorId: userId,
      },
      include: {
        author: { select: { id: true, name: true, image: true } },
      },
    });

    return json(snapshot, 201);
  } catch (err) {
    return handleError(err);
  }
}
