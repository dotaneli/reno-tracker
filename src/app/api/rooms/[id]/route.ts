import { prisma } from "@/lib/prisma";
import { requireUser, requireRoomAccess } from "@/lib/dal";
import { json, handleError, parseBody, type RoomUpdateBody } from "@/lib/api";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requireUser();
    const { id } = await params;
    await requireRoomAccess(userId, id);

    const room = await prisma.room.findUnique({
      where: { id },
      include: { floor: true, nodeRooms: { include: { node: true } } },
    });
    return json(room);
  } catch (err) {
    return handleError(err);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requireUser();
    const { id } = await params;
    await requireRoomAccess(userId, id, ["OWNER", "EDITOR"]);

    const body = await parseBody<RoomUpdateBody>(request);
    const room = await prisma.room.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name.trim() }),
        ...(body.type !== undefined && { type: body.type as any }),
      },
    });
    return json(room);
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requireUser();
    const { id } = await params;
    await requireRoomAccess(userId, id, ["OWNER", "EDITOR"]);
    await prisma.room.delete({ where: { id } });
    return new Response(null, { status: 204 });
  } catch (err) {
    return handleError(err);
  }
}
