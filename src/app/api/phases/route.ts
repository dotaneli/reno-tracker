import { prisma } from "@/lib/prisma";
import {
  json,
  errorResponse,
  handlePrismaError,
  parseBody,
  type PhaseCreateBody,
} from "@/lib/api";

// GET /api/phases — list all phases (optionally filter by projectId)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    const phases = await prisma.phase.findMany({
      where: projectId ? { projectId } : undefined,
      include: { _count: { select: { items: true, issues: true } } },
      orderBy: { createdAt: "asc" },
    });

    return json(phases);
  } catch (err) {
    return handlePrismaError(err);
  }
}

// POST /api/phases — create a new phase
export async function POST(request: Request) {
  try {
    const body = await parseBody<PhaseCreateBody>(request);

    if (!body.name?.trim()) return errorResponse("name is required", 400);
    if (!body.projectId?.trim()) return errorResponse("projectId is required", 400);

    const phase = await prisma.phase.create({
      data: {
        name: body.name.trim(),
        projectId: body.projectId,
        status: body.status,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        endDate: body.endDate ? new Date(body.endDate) : undefined,
      },
    });

    return json(phase, 201);
  } catch (err) {
    if (err instanceof SyntaxError) return errorResponse("Invalid JSON body", 400);
    return handlePrismaError(err);
  }
}
