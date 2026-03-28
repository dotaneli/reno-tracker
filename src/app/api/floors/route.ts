import { prisma } from "@/lib/prisma";
import { requireUser, requireProjectAccess } from "@/lib/dal";
import { json, errorResponse, handleError, parseBody, type FloorCreateBody } from "@/lib/api";

export async function GET(request: Request) {
  try {
    const { userId } = await requireUser();
    const projectId = new URL(request.url).searchParams.get("projectId");
    if (!projectId) return errorResponse("projectId is required", 400);

    await requireProjectAccess(userId, projectId);

    const floors = await prisma.floor.findMany({
      where: { projectId },
      include: { rooms: true },
      orderBy: { sortOrder: "asc" },
    });
    return json(floors);
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await requireUser();
    const body = await parseBody<FloorCreateBody>(request);

    if (!body.name?.trim()) return errorResponse("name is required", 400);
    if (!body.projectId?.trim()) return errorResponse("projectId is required", 400);

    await requireProjectAccess(userId, body.projectId, ["OWNER", "EDITOR"]);

    const floor = await prisma.floor.create({
      data: {
        name: body.name.trim(),
        projectId: body.projectId,
        sortOrder: body.sortOrder ?? 0,
      },
      include: { rooms: true },
    });
    return json(floor, 201);
  } catch (err) {
    return handleError(err);
  }
}
