/**
 * OAuth Callback — Google redirects here after user signs in.
 * We exchange Google's code for user info, create/find the user,
 * generate an authorization code, and redirect back to the LLM platform.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomBytes, createHash } from "crypto";
import { log } from "@/lib/logger";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const googleCode = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");

  if (!googleCode || !stateParam) {
    return new Response("Missing code or state", { status: 400 });
  }

  // Decode the original LLM platform's redirect_uri, state, and PKCE
  let redirectUri: string, originalState: string, codeChallenge: string, codeChallengeMethod: string;
  try {
    const decoded = JSON.parse(Buffer.from(stateParam, "base64url").toString());
    redirectUri = decoded.redirect_uri;
    originalState = decoded.state;
    codeChallenge = decoded.code_challenge || "";
    codeChallengeMethod = decoded.code_challenge_method || "";
  } catch {
    return new Response("Invalid state parameter", { status: 400 });
  }

  const baseUrl = process.env.NEXTAUTH_URL || `${url.protocol}//${url.host}`;

  // Exchange Google code for tokens
  let googleUser: { email: string; name: string; picture?: string };
  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: googleCode,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: `${baseUrl}/api/oauth/callback`,
        grant_type: "authorization_code",
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      log("error", "oauth_token_exchange_failed", { error: JSON.stringify(tokenData) });
      return new Response("Failed to exchange Google code", { status: 400 });
    }

    // Get user info
    const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    googleUser = await userRes.json();
    if (!googleUser.email) {
      return new Response("Could not get user email from Google", { status: 400 });
    }
  } catch (err) {
    log("error", "oauth_google_error", { error: err instanceof Error ? err.message : String(err) });
    return new Response("Google authentication failed", { status: 500 });
  }

  // Find or create user in our database
  let user = await prisma.user.findFirst({ where: { email: googleUser.email } });
  if (!user) {
    user = await prisma.user.create({
      data: { email: googleUser.email, name: googleUser.name, image: googleUser.picture },
    });
    log("info", "oauth_user_created", { userId: user.id, message: googleUser.email });
  }

  // Generate an API key for the user (READ_WRITE scope)
  const apiKeyPlain = "rk_" + randomBytes(20).toString("hex");
  const apiKeyHash = createHash("sha256").update(apiKeyPlain).digest("hex");
  await prisma.apiKey.create({
    data: {
      name: "LLM Connector",
      keyHash: apiKeyHash,
      keyPrefix: apiKeyPlain.slice(0, 7) + "...",
      scope: "READ_WRITE",
      userId: user.id,
    },
  });

  // Generate a short-lived authorization code that maps to this API key
  // Store it temporarily (5 minute TTL) using a simple in-memory approach via the database
  const authCode = randomBytes(32).toString("hex");
  const authCodeHash = createHash("sha256").update(authCode).digest("hex");

  // Store the mapping: authCode → apiKey (we'll use PendingInbox as a temp store)
  await prisma.pendingInbox.create({
    data: {
      source: "oauth_code",
      rawPayload: { apiKey: apiKeyPlain, codeHash: authCodeHash, codeChallenge, codeChallengeMethod, expiresAt: Date.now() + 5 * 60 * 1000 },
    },
  });

  log("info", "oauth_code_issued", { userId: user.id, message: googleUser.email });

  // Redirect back to the LLM platform with the authorization code
  const callbackUrl = new URL(redirectUri);
  callbackUrl.searchParams.set("code", authCode);
  if (originalState) callbackUrl.searchParams.set("state", originalState);

  return NextResponse.redirect(callbackUrl.toString(), 302);
}
