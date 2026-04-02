import { resolveAuth, requireProjectAccess } from "@/lib/dal";
import { json, handleError, errorResponse } from "@/lib/api";
import { prisma } from "@/lib/prisma";

// GET /api/chat/history?projectId=X — load chat history for user+project
export async function GET(request: Request) {
  try {
    const auth = await resolveAuth();
    const url = new URL(request.url);
    const projectId = url.searchParams.get("projectId");

    if (!projectId) return errorResponse("projectId is required", 400);

    await requireProjectAccess(auth.userId, projectId);

    const messages = await prisma.chatMessage.findMany({
      where: { userId: auth.userId, projectId },
      orderBy: { createdAt: "asc" },
      take: 100,
      select: { id: true, role: true, content: true, projectId: true, createdAt: true },
    });

    return json(messages);
  } catch (err) {
    return handleError(err);
  }
}
