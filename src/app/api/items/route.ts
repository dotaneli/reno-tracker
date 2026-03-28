import { prisma } from "@/lib/prisma";
import {
  json,
  errorResponse,
  handlePrismaError,
  parseBody,
  type ItemCreateBody,
} from "@/lib/api";

// GET /api/items — list items (optionally filter by phaseId or vendorId)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const phaseId = searchParams.get("phaseId");
    const vendorId = searchParams.get("vendorId");

    const items = await prisma.item.findMany({
      where: {
        ...(phaseId && { phaseId }),
        ...(vendorId && { vendorId }),
      },
      include: { phase: true, vendor: true },
      orderBy: { createdAt: "asc" },
    });

    return json(items);
  } catch (err) {
    return handlePrismaError(err);
  }
}

// POST /api/items
export async function POST(request: Request) {
  try {
    const body = await parseBody<ItemCreateBody>(request);

    if (!body.name?.trim()) return errorResponse("name is required", 400);
    if (!body.phaseId?.trim()) return errorResponse("phaseId is required", 400);

    const item = await prisma.item.create({
      data: {
        name: body.name.trim(),
        phaseId: body.phaseId,
        vendorId: body.vendorId,
        expectedCost: body.expectedCost,
        actualCost: body.actualCost,
        status: body.status,
      },
      include: { phase: true, vendor: true },
    });

    return json(item, 201);
  } catch (err) {
    if (err instanceof SyntaxError) return errorResponse("Invalid JSON body", 400);
    return handlePrismaError(err);
  }
}
