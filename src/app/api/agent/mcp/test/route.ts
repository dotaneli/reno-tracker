import { resolveAuth, getUserProjectIds } from "@/lib/dal";
import { json, handleError, errorResponse } from "@/lib/api";
import { TOOLS } from "@/lib/mcp-server";

// GET /api/agent/mcp/test — verify API key works and return connection info
export async function GET() {
  try {
    const auth = await resolveAuth();
    const projectIds = await getUserProjectIds(auth.userId);

    return json({
      ok: true,
      tools: TOOLS.length,
      user: auth.email,
      projects: projectIds.length,
      scope: auth.type === "apiKey" ? auth.scope : "SESSION",
    });
  } catch (err) {
    return handleError(err);
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
    },
  });
}
