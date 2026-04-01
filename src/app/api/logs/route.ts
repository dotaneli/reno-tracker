import { requireUser } from "@/lib/dal";
import { json, handleError, errorResponse } from "@/lib/api";
import { queryLogs, type LogLevel } from "@/lib/logger";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "dotaneli@gmail.com";

// GET /api/logs?level=error&event=seed_failed&limit=50&since=2026-04-01
export async function GET(request: Request) {
  try {
    const { email } = await requireUser();
    if (email !== ADMIN_EMAIL) return errorResponse("Forbidden", 403);

    const url = new URL(request.url);
    const level = url.searchParams.get("level") as LogLevel | null;
    const event = url.searchParams.get("event") || undefined;
    const limit = parseInt(url.searchParams.get("limit") || "100", 10);
    const since = url.searchParams.get("since") || undefined;

    const logs = await queryLogs({
      level: level || undefined,
      event,
      limit: Math.min(limit, 500),
      since,
    });

    return json(logs);
  } catch (err) {
    return handleError(err);
  }
}
