import { randomBytes, createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/dal";
import { json, errorResponse, handleError } from "@/lib/api";

export async function GET() {
  try {
    const { userId } = await requireUser();
    const keys = await prisma.apiKey.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scope: true,
        projectId: true,
        project: { select: { name: true } },
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return json(keys);
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await requireUser();
    const body = await request.json();
    const { name, scope, projectId, expiresAt } = body;

    if (!name?.trim()) return errorResponse("name is required", 400);

    // Max 10 keys per user
    const count = await prisma.apiKey.count({ where: { userId } });
    if (count >= 10) return errorResponse("Maximum 10 API keys allowed", 400);

    // If projectId given, verify user has access
    if (projectId) {
      const member = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId } },
      });
      if (!member) return errorResponse("Project not found", 404);
    }

    // Generate key: rk_ + 40 hex chars
    const plaintext = "rk_" + randomBytes(20).toString("hex");
    const keyHash = createHash("sha256").update(plaintext).digest("hex");
    const keyPrefix = plaintext.slice(0, 7) + "...";

    const key = await prisma.apiKey.create({
      data: {
        name: name.trim(),
        keyHash,
        keyPrefix,
        scope: scope || "READ_WRITE",
        projectId: projectId || null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        userId,
      },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scope: true,
        projectId: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    // Return plaintext key ONCE — it's never stored or retrievable again
    return json({ ...key, key: plaintext }, 201);
  } catch (err) {
    return handleError(err);
  }
}
