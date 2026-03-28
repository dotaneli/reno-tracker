import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/dal";
import { json, errorResponse, handleError, parseBody } from "@/lib/api";

interface ProjectCreateBody {
  name: string;
  totalBudget: number;
  expectedStartDate?: string;
  expectedEndDate?: string;
}

// GET /api/projects — list all projects the user has access to
export async function GET() {
  try {
    const { userId } = await requireUser();

    const projects = await prisma.project.findMany({
      where: { members: { some: { userId } } },
      include: {
        members: { include: { user: { select: { id: true, name: true, email: true, image: true } } } },
        _count: { select: { nodes: true, floors: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return json(projects);
  } catch (err) {
    return handleError(err);
  }
}

// POST /api/projects — create a new project (caller becomes OWNER)
export async function POST(request: Request) {
  try {
    const { userId } = await requireUser();
    const body = await parseBody<ProjectCreateBody>(request);

    if (!body.name?.trim()) return errorResponse("name is required", 400);
    if (body.totalBudget == null || body.totalBudget < 0)
      return errorResponse("totalBudget is required and must be >= 0", 400);

    const project = await prisma.project.create({
      data: {
        name: body.name.trim(),
        totalBudget: body.totalBudget,
        expectedStartDate: body.expectedStartDate ? new Date(body.expectedStartDate) : undefined,
        expectedEndDate: body.expectedEndDate ? new Date(body.expectedEndDate) : undefined,
        members: {
          create: { userId, role: "OWNER" },
        },
      },
      include: {
        members: { include: { user: { select: { id: true, name: true, email: true, image: true } } } },
      },
    });

    return json(project, 201);
  } catch (err) {
    return handleError(err);
  }
}
