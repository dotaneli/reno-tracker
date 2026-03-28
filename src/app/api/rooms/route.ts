import { prisma } from "@/lib/prisma";
import { requireUser, requireFloorAccess, requireProjectAccess } from "@/lib/dal";
import { json, errorResponse, handleError, parseBody, type RoomCreateBody } from "@/lib/api";

export async function GET(request: Request) {
  try {
    const { userId } = await requireUser();
    const projectId = new URL(request.url).searchParams.get("projectId");
    if (!projectId) return errorResponse("projectId is required", 400);

    await requireProjectAccess(userId, projectId);

    const rooms = await prisma.room.findMany({
      where: { floor: { projectId } },
      include: { floor: true },
      orderBy: { name: "asc" },
    });
    return json(rooms);
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await requireUser();
    const body = await parseBody<RoomCreateBody>(request);

    if (!body.name?.trim()) return errorResponse("name is required", 400);
    if (!body.floorId?.trim()) return errorResponse("floorId is required", 400);

    await requireFloorAccess(userId, body.floorId, ["OWNER", "EDITOR"]);

    const room = await prisma.room.create({
      data: {
        name: body.name.trim(),
        floorId: body.floorId,
        type: (body.type as any) || undefined,
      },
      include: { floor: true },
    });
    return json(room, 201);
  } catch (err) {
    return handleError(err);
  }
}
