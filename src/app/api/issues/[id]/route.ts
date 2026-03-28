import { prisma } from "@/lib/prisma";
import {
  json,
  errorResponse,
  handlePrismaError,
  parseBody,
  type IssueUpdateBody,
} from "@/lib/api";

// GET /api/issues/:id
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const issue = await prisma.issue.findUnique({
      where: { id },
      include: { phase: true },
    });

    if (!issue) return errorResponse("Issue not found", 404);
    return json(issue);
  } catch (err) {
    return handlePrismaError(err);
  }
}

// PATCH /api/issues/:id
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await parseBody<IssueUpdateBody>(request);

    const issue = await prisma.issue.update({
      where: { id },
      data: {
        ...(body.title !== undefined && { title: body.title.trim() }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.phaseId !== undefined && { phaseId: body.phaseId }),
      },
      include: { phase: true },
    });

    return json(issue);
  } catch (err) {
    if (err instanceof SyntaxError) return errorResponse("Invalid JSON body", 400);
    return handlePrismaError(err);
  }
}

// DELETE /api/issues/:id
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.issue.delete({ where: { id } });
    return new Response(null, { status: 204 });
  } catch (err) {
    return handlePrismaError(err);
  }
}
