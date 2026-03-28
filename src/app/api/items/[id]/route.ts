import { prisma } from "@/lib/prisma";
import {
  json,
  errorResponse,
  handlePrismaError,
  parseBody,
  type ItemUpdateBody,
} from "@/lib/api";

// GET /api/items/:id
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const item = await prisma.item.findUnique({
      where: { id },
      include: { phase: true, vendor: true },
    });

    if (!item) return errorResponse("Item not found", 404);
    return json(item);
  } catch (err) {
    return handlePrismaError(err);
  }
}

// PATCH /api/items/:id
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await parseBody<ItemUpdateBody>(request);

    const item = await prisma.item.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name.trim() }),
        ...(body.phaseId !== undefined && { phaseId: body.phaseId }),
        ...(body.vendorId !== undefined && { vendorId: body.vendorId }),
        ...(body.expectedCost !== undefined && { expectedCost: body.expectedCost }),
        ...(body.actualCost !== undefined && { actualCost: body.actualCost }),
        ...(body.status !== undefined && { status: body.status }),
      },
      include: { phase: true, vendor: true },
    });

    return json(item);
  } catch (err) {
    if (err instanceof SyntaxError) return errorResponse("Invalid JSON body", 400);
    return handlePrismaError(err);
  }
}

// DELETE /api/items/:id
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.item.delete({ where: { id } });
    return new Response(null, { status: 204 });
  } catch (err) {
    return handlePrismaError(err);
  }
}
