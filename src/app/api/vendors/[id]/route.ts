import { prisma } from "@/lib/prisma";
import { requireUser, requireProjectAccess } from "@/lib/dal";
import { json, errorResponse, handleError, parseBody, type VendorUpdateBody } from "@/lib/api";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requireUser();
    const { id } = await params;

    const vendor = await prisma.vendor.findUnique({
      where: { id },
      include: { nodes: true },
    });
    if (!vendor) return errorResponse("Vendor not found", 404);

    await requireProjectAccess(userId, vendor.projectId);
    return json(vendor);
  } catch (err) {
    return handleError(err);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requireUser();
    const { id } = await params;

    const existing = await prisma.vendor.findUnique({ where: { id }, select: { projectId: true } });
    if (!existing) return errorResponse("Vendor not found", 404);
    await requireProjectAccess(userId, existing.projectId, ["OWNER", "EDITOR"]);

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
    return handleError(err);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requireUser();
    const { id } = await params;

    const existing = await prisma.vendor.findUnique({ where: { id }, select: { projectId: true } });
    if (!existing) return errorResponse("Vendor not found", 404);
    await requireProjectAccess(userId, existing.projectId, ["OWNER", "EDITOR"]);

    await prisma.vendor.delete({ where: { id } });
    return new Response(null, { status: 204 });
  } catch (err) {
    return handleError(err);
  }
}
