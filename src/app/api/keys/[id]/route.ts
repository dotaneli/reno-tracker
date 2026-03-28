import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/dal";
import { handleError } from "@/lib/api";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await requireUser();
    const { id } = await params;

    const key = await prisma.apiKey.findUnique({ where: { id }, select: { userId: true } });
    if (!key || key.userId !== userId) {
      return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
    }

    await prisma.apiKey.delete({ where: { id } });
    return new Response(null, { status: 204 });
  } catch (err) {
    return handleError(err);
  }
}
