/**
 * RFC 9728 Protected Resource Metadata for the MCP endpoint.
 * Tells MCP clients (claude.ai, etc.) where to obtain authorization.
 */

const BASE_URL = process.env.NEXTAUTH_URL || "https://reno-tracker-rho.vercel.app";

export async function GET() {
  return Response.json({
    resource: `${BASE_URL}/api/agent/mcp`,
    authorization_servers: [`${BASE_URL}`],
    bearer_methods_supported: ["header"],
    scopes_supported: ["read", "write"],
  }, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
