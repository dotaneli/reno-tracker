/**
 * OAuth 2.1 Authorization Server Metadata (RFC 8414).
 * Tells MCP clients where to authorize and exchange tokens.
 */

const BASE_URL = process.env.NEXTAUTH_URL || "https://reno-tracker-rho.vercel.app";

export async function GET() {
  return Response.json({
    issuer: BASE_URL,
    authorization_endpoint: `${BASE_URL}/api/oauth/authorize`,
    token_endpoint: `${BASE_URL}/api/oauth/token`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    token_endpoint_auth_methods_supported: ["none"],
    code_challenge_methods_supported: ["S256"],
    registration_endpoint: `${BASE_URL}/api/oauth/register`,
  }, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
