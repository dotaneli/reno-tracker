/**
 * OAuth 2.1 Dynamic Client Registration (RFC 7591).
 * Allows MCP clients (claude.ai) to register themselves automatically.
 */

import { randomBytes } from "crypto";

export async function POST(request: Request) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }

  const clientId = `mcp_${randomBytes(16).toString("hex")}`;
  const clientSecret = randomBytes(32).toString("hex");

  return Response.json({
    client_id: clientId,
    client_secret: clientSecret,
    client_name: body.client_name || "MCP Client",
    redirect_uris: body.redirect_uris || [],
    grant_types: ["authorization_code"],
    response_types: ["code"],
    token_endpoint_auth_method: "none",
  }, {
    status: 201,
    headers: { "Access-Control-Allow-Origin": "*" },
  });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
