import { prisma } from "@/lib/prisma";
import {
  json,
  errorResponse,
  handlePrismaError,
  parseBody,
  type IssueCreateBody,
} from "@/lib/api";

// GET /api/issues — list issues (optionally filter by phaseId or status)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const phaseId = searchParams.get("phaseId");
    const status = searchParams.get("status");

    const issues = await prisma.issue.findMany({
      where: {
        ...(phaseId && { phaseId }),
        ...(status && { status: status as "OPEN" | "IN_PROGRESS" | "RESOLVED" }),
      },
      include: { phase: true },
      orderBy: { createdAt: "desc" },
    });

    return json(issues);
  } catch (err) {
    return handlePrismaError(err);
  }
}

// POST /api/issues
export async function POST(request: Request) {
  try {
    const body = await parseBody<IssueCreateBody>(request);

    if (!body.title?.trim()) return errorResponse("title is required", 400);
    if (!body.phaseId?.trim()) return errorResponse("phaseId is required", 400);

    const issue = await prisma.issue.create({
      data: {
        title: body.title.trim(),
        phaseId: body.phaseId,
        description: body.description?.trim(),
        status: body.status,
      },
      include: { phase: true },
    });

    return json(issue, 201);
  } catch (err) {
    if (err instanceof SyntaxError) return errorResponse("Invalid JSON body", 400);
    return handlePrismaError(err);
  }
}
