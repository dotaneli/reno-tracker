import { requireUser, requireProjectAccess } from "@/lib/dal";
import { json, handleError } from "@/lib/api";
import { redoLast } from "@/lib/actionlog";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await requireUser();
    const { id } = await params;
    await requireProjectAccess(userId, id, ["OWNER", "EDITOR"]);
    const result = await redoLast(id, userId);
    return json(result, result.success ? 200 : 400);
  } catch (err) { return handleError(err); }
}
