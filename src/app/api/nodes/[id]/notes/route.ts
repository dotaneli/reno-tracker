import { prisma } from "@/lib/prisma";
import { requireUser, requireNodeAccess } from "@/lib/dal";
import { json, errorResponse, handleError, parseBody, type NoteCreateBody } from "@/lib/api";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await requireUser();
    const { id } = await params;
    await requireNodeAccess(userId, id);
    const notes = await prisma.note.findMany({
      where: { nodeId: id },
      include: { author: { select: { id: true, name: true, image: true } } },
      orderBy: { createdAt: "desc" },
    });
    return json(notes);
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await requireUser();
    const { id } = await params;
    await requireNodeAccess(userId, id, ["OWNER", "EDITOR"]);
    const body = await parseBody<NoteCreateBody>(request);
    if (!body.text?.trim()) return errorResponse("text is required", 400);
    const note = await prisma.note.create({
      data: { text: body.text.trim(), nodeId: id, authorId: userId },
      include: { author: { select: { id: true, name: true, image: true } } },
    });
    return json(note, 201);
  } catch (err) { return handleError(err); }
}
