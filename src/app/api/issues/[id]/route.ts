import { prisma } from "@/lib/prisma";
import { requireUser, requireIssueAccess } from "@/lib/dal";
import { json, handleError, parseBody, type IssueUpdateBody } from "@/lib/api";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await requireUser();
    const { id } = await params;
    await requireIssueAccess(userId, id);
    const issue = await prisma.issue.findUnique({ where: { id }, include: { node: true } });
    return json(issue);
  } catch (err) { return handleError(err); }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await requireUser();
    const { id } = await params;
    await requireIssueAccess(userId, id, ["OWNER", "EDITOR"]);
    const body = await parseBody<IssueUpdateBody>(request);
    const issue = await prisma.issue.update({
      where: { id },
      data: {
        ...(body.title !== undefined && { title: body.title.trim() }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.status !== undefined && { status: body.status as any }),
        ...(body.nodeId !== undefined && { nodeId: body.nodeId }),
      },
      include: { node: true },
    });
    return json(issue);
  } catch (err) { return handleError(err); }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await requireUser();
    const { id } = await params;
    await requireIssueAccess(userId, id, ["OWNER", "EDITOR"]);
    await prisma.issue.delete({ where: { id } });
    return new Response(null, { status: 204 });
  } catch (err) { return handleError(err); }
}
