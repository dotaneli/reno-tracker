import { prisma } from "@/lib/prisma";
import {
  json,
  errorResponse,
  handlePrismaError,
  parseBody,
  type VendorCreateBody,
} from "@/lib/api";

// GET /api/vendors
export async function GET() {
  try {
    const vendors = await prisma.vendor.findMany({
      include: { _count: { select: { items: true } } },
      orderBy: { name: "asc" },
    });
    return json(vendors);
  } catch (err) {
    return handlePrismaError(err);
  }
}

// POST /api/vendors
export async function POST(request: Request) {
  try {
    const body = await parseBody<VendorCreateBody>(request);

    if (!body.name?.trim()) return errorResponse("name is required", 400);

    const vendor = await prisma.vendor.create({
      data: {
        name: body.name.trim(),
        category: body.category?.trim(),
        phone: body.phone?.trim(),
        email: body.email?.trim(),
      },
    });

    return json(vendor, 201);
  } catch (err) {
    if (err instanceof SyntaxError) return errorResponse("Invalid JSON body", 400);
    return handlePrismaError(err);
  }
}
