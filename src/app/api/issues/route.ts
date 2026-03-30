import { prisma } from "@/lib/prisma";
import { requireUser, requireNodeAccess, requireProjectAccess, getUserProjectIds } from "@/lib/dal";
import { json, errorResponse, handleError, parseBody, type IssueCreateBody } from "@/lib/api";

export async function GET(request: Request) {
  try {
    const { userId } = await requireUser();
    const { searchParams } = new URL(request.url);
    const nodeId = searchParams.get("nodeId");
    const status = searchParams.get("status");

    if (nodeId) await requireNodeAccess(userId, nodeId);
    const projectId = searchParams.get("projectId");
    if (projectId) await requireProjectAccess(userId, projectId);
    const projectIds = projectId ? [projectId] : await getUserProjectIds(userId);

    const issues = await prisma.issue.findMany({
      where: {
        node: { projectId: { in: projectIds } },
        ...(nodeId && { nodeId }),
        ...(status && { status: status as any }),
      },
      include: { node: true },
      orderBy: { createdAt: "desc" },
    });
    return json(issues);
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const { userId } = await requireUser();
    const body = await parseBody<IssueCreateBody>(request);
    if (!body.title?.trim()) return errorResponse("title is required", 400);
    if (!body.nodeId?.trim()) return errorResponse("nodeId is required", 400);
    await requireNodeAccess(userId, body.nodeId, ["OWNER", "EDITOR"]);

    const issue = await prisma.issue.create({
      data: { title: body.title.trim(), nodeId: body.nodeId, description: body.description?.trim(), status: (body.status as any) || undefined },
      include: { node: true },
    });
    return json(issue, 201);
  } catch (err) { return handleError(err); }
}
