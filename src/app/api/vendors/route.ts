import { prisma } from "@/lib/prisma";
import { requireUser, requireProjectAccess } from "@/lib/dal";
import { json, errorResponse, handleError, parseBody, type VendorCreateBody } from "@/lib/api";

export async function GET(request: Request) {
  try {
    const { userId } = await requireUser();
    const projectId = new URL(request.url).searchParams.get("projectId");
    if (!projectId) return errorResponse("projectId is required", 400);

    await requireProjectAccess(userId, projectId);

    const vendors = await prisma.vendor.findMany({
      where: { projectId },
      include: { _count: { select: { nodes: true } } },
      orderBy: { name: "asc" },
    });
    return json(vendors);
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await requireUser();
    const body = await parseBody<VendorCreateBody>(request);

    if (!body.name?.trim()) return errorResponse("name is required", 400);
    if (!body.projectId?.trim()) return errorResponse("projectId is required", 400);

    await requireProjectAccess(userId, body.projectId, ["OWNER", "EDITOR"]);

    const name = body.name.trim();
    // Idempotent: if a vendor with this name (case-insensitive) already exists in the project, return it.
    const existing = await prisma.vendor.findFirst({
      where: { projectId: body.projectId, name: { equals: name, mode: "insensitive" } },
    });
    if (existing) return json(existing, 200);

    const vendor = await prisma.vendor.create({
      data: {
        name,
        projectId: body.projectId,
        category: body.category?.trim(),
        phone: body.phone?.trim(),
        email: body.email?.trim(),
      },
    });
    return json(vendor, 201);
  } catch (err) {
    return handleError(err);
  }
}
