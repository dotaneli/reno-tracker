import { prisma } from "@/lib/prisma";
import { requireUser, requireProjectAccess } from "@/lib/dal";
import { json, errorResponse, handleError, parseBody } from "@/lib/api";

export async function GET(request: Request) {
  try {
    const { userId } = await requireUser();
    const projectId = new URL(request.url).searchParams.get("projectId");
    if (!projectId) return errorResponse("projectId is required", 400);
    await requireProjectAccess(userId, projectId);

    const categories = await prisma.category.findMany({
      where: { projectId },
      include: { _count: { select: { nodes: true } } },
      orderBy: { name: "asc" },
    });
    return json(categories);
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const { userId } = await requireUser();
    const body = await parseBody<{ name: string; projectId: string; color?: string }>(request);
    if (!body.name?.trim()) return errorResponse("name is required", 400);
    if (!body.projectId?.trim()) return errorResponse("projectId is required", 400);
    await requireProjectAccess(userId, body.projectId, ["OWNER", "EDITOR"]);

    const cat = await prisma.category.create({
      data: { name: body.name.trim(), projectId: body.projectId, color: body.color },
    });
    return json(cat, 201);
  } catch (err) { return handleError(err); }
}
