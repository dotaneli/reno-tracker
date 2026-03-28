import { prisma } from "@/lib/prisma";
import {
  json,
  errorResponse,
  handlePrismaError,
  parseBody,
  type VendorUpdateBody,
} from "@/lib/api";

// GET /api/vendors/:id
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const vendor = await prisma.vendor.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!vendor) return errorResponse("Vendor not found", 404);
    return json(vendor);
  } catch (err) {
    return handlePrismaError(err);
  }
}

// PATCH /api/vendors/:id
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await parseBody<VendorUpdateBody>(request);

    const vendor = await prisma.vendor.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name.trim() }),
        ...(body.category !== undefined && { category: body.category }),
        ...(body.phone !== undefined && { phone: body.phone }),
        ...(body.email !== undefined && { email: body.email }),
      },
    });

    return json(vendor);
  } catch (err) {
    if (err instanceof SyntaxError) return errorResponse("Invalid JSON body", 400);
    return handlePrismaError(err);
  }
}

// DELETE /api/vendors/:id
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.vendor.delete({ where: { id } });
    return new Response(null, { status: 204 });
  } catch (err) {
    return handlePrismaError(err);
  }
}
