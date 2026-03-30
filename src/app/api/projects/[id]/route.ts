import { prisma } from "@/lib/prisma";
import { requireUser, requireProjectAccess } from "@/lib/dal";
import { json, handleError, parseBody } from "@/lib/api";

interface ProjectUpdateBody {
  name?: string;
  totalBudget?: number;
  isPublic?: boolean;
}

// GET /api/projects/:id
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requireUser();
    const { id } = await params;

    await requireProjectAccess(userId, id);

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        nodes: { where: { parentId: null }, include: { _count: { select: { children: true, issues: true } } } },
        floors: { include: { rooms: true } },
        members: { include: { user: { select: { id: true, name: true, email: true, image: true } } } },
      },
    });

    return json(project);
  } catch (err) {
    return handleError(err);
  }
}

// PATCH /api/projects/:id (OWNER only)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requireUser();
    const { id } = await params;

    await requireProjectAccess(userId, id, ["OWNER"]);

    const body = await parseBody<ProjectUpdateBody>(request);
    const project = await prisma.project.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name.trim() }),
        ...(body.totalBudget !== undefined && { totalBudget: body.totalBudget }),
        ...(body.isPublic !== undefined && { isPublic: body.isPublic }),
      },
    });

    return json(project);
  } catch (err) {
    return handleError(err);
  }
}

// DELETE /api/projects/:id (OWNER only)
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requireUser();
    const { id } = await params;

    await requireProjectAccess(userId, id, ["OWNER"]);
    await prisma.project.delete({ where: { id } });

    return new Response(null, { status: 204 });
  } catch (err) {
    return handleError(err);
  }
}
