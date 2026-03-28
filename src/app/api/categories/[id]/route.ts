import { prisma } from "@/lib/prisma";
import { requireUser, requireProjectAccess } from "@/lib/dal";
import { json, errorResponse, handleError, parseBody } from "@/lib/api";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await requireUser();
    const { id } = await params;
    const cat = await prisma.category.findUnique({ where: { id }, select: { projectId: true } });
    if (!cat) return errorResponse("Category not found", 404);
    await requireProjectAccess(userId, cat.projectId, ["OWNER", "EDITOR"]);

    const body = await parseBody<{ name?: string; color?: string }>(request);
    const updated = await prisma.category.update({
      where: { id },
      data: { ...(body.name !== undefined && { name: body.name.trim() }), ...(body.color !== undefined && { color: body.color }) },
    });
    return json(updated);
  } catch (err) { return handleError(err); }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await requireUser();
    const { id } = await params;
    const cat = await prisma.category.findUnique({ where: { id }, select: { projectId: true } });
    if (!cat) return errorResponse("Category not found", 404);
    await requireProjectAccess(userId, cat.projectId, ["OWNER", "EDITOR"]);
    await prisma.category.delete({ where: { id } });
    return new Response(null, { status: 204 });
  } catch (err) { return handleError(err); }
}
