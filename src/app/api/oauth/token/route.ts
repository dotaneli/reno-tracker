/**
 * OAuth 2.1 Token Endpoint
 * Exchanges an authorization code for a Bearer access token.
 * The access token is an API key that works with our existing MCP auth.
 */

import { prisma } from "@/lib/prisma";
import { createHash } from "crypto";
import { log } from "@/lib/logger";

export async function POST(request: Request) {
  let body: any;
  try {
    // Support both JSON and form-encoded (OAuth spec allows both)
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      body = await request.json();
    } else {
      const formData = await request.text();
      body = Object.fromEntries(new URLSearchParams(formData));
    }
  } catch {
    return Response.json({ error: "invalid_request", error_description: "Could not parse request body" }, { status: 400 });
  }

  const { grant_type, code, redirect_uri, code_verifier } = body;

  if (grant_type !== "authorization_code") {
    return Response.json({ error: "unsupported_grant_type", error_description: "Only authorization_code is supported" }, { status: 400 });
  }

  if (!code) {
    return Response.json({ error: "invalid_request", error_description: "Missing authorization code" }, { status: 400 });
  }

  // Look up the authorization code
  const codeHash = createHash("sha256").update(code).digest("hex");
  const pending = await prisma.pendingInbox.findMany({
    where: { source: "oauth_code" },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  let apiKey: string | null = null;
  let matchedId: string | null = null;

  for (const p of pending) {
    try {
      const data = JSON.parse(JSON.stringify(p.rawPayload));
      if (data.codeHash === codeHash) {
        if (data.expiresAt && data.expiresAt < Date.now()) {
          // Code expired, clean it up
          await prisma.pendingInbox.delete({ where: { id: p.id } }).catch(() => {});
          return Response.json({ error: "invalid_grant", error_description: "Authorization code expired" }, { status: 400 });
        }
        // Verify PKCE if code_challenge was set
        if (data.codeChallenge) {
          if (!code_verifier) {
            return Response.json({ error: "invalid_grant", error_description: "Missing code_verifier for PKCE" }, { status: 400 });
          }
          const expectedChallenge = createHash("sha256").update(code_verifier).digest("base64url");
          if (expectedChallenge !== data.codeChallenge) {
            return Response.json({ error: "invalid_grant", error_description: "PKCE verification failed" }, { status: 400 });
          }
        }
        apiKey = data.apiKey;
        matchedId = p.id;
        break;
      }
    } catch {}
  }

  if (!apiKey || !matchedId) {
    return Response.json({ error: "invalid_grant", error_description: "Invalid authorization code" }, { status: 400 });
  }

  // Delete the used code (one-time use)
  await prisma.pendingInbox.delete({ where: { id: matchedId } }).catch(() => {});

  // Clean up expired codes (housekeeping)
  for (const p of pending) {
    try {
      const data = JSON.parse(JSON.stringify(p.rawPayload));
      if (data.expiresAt && data.expiresAt < Date.now()) {
        await prisma.pendingInbox.delete({ where: { id: p.id } }).catch(() => {});
      }
    } catch {}
  }

  log("info", "oauth_token_issued", { message: `API key issued via OAuth` });

  return Response.json({
    access_token: apiKey,
    token_type: "Bearer",
    // No expiration — API keys don't expire by default
  }, {
    headers: {
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
    },
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
