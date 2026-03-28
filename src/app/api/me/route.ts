import { requireUser } from "@/lib/dal";
import { json, handleError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

// GET /api/me — return the authenticated user's profile
export async function GET() {
  try {
    const { userId } = await requireUser();

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        createdAt: true,
        memberships: {
          include: {
            project: { select: { id: true, name: true } },
          },
        },
      },
    });

    return json(user);
  } catch (err) {
    return handleError(err);
  }
}
