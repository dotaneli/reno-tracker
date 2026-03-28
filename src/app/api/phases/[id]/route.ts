import { prisma } from "@/lib/prisma";
import {
  json,
  errorResponse,
  handlePrismaError,
  parseBody,
  type PhaseUpdateBody,
} from "@/lib/api";

// GET /api/phases/:id
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const phase = await prisma.phase.findUnique({
      where: { id },
      include: { items: true, issues: true },
    });

    if (!phase) return errorResponse("Phase not found", 404);
    return json(phase);
  } catch (err) {
    return handlePrismaError(err);
  }
}

// PATCH /api/phases/:id
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await parseBody<PhaseUpdateBody>(request);

    const phase = await prisma.phase.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name.trim() }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.startDate !== undefined && {
          startDate: body.startDate ? new Date(body.startDate) : null,
        }),
        ...(body.endDate !== undefined && {
          endDate: body.endDate ? new Date(body.endDate) : null,
        }),
      },
    });

    return json(phase);
  } catch (err) {
    if (err instanceof SyntaxError) return errorResponse("Invalid JSON body", 400);
    return handlePrismaError(err);
  }
}

// DELETE /api/phases/:id
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.phase.delete({ where: { id } });
    return new Response(null, { status: 204 });
  } catch (err) {
    return handlePrismaError(err);
  }
}
