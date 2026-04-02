/**
 * OAuth 2.1 Authorization Endpoint
 * Redirects user to Google OAuth, preserving the LLM platform's redirect_uri and state.
 * Used by claude.ai, ChatGPT, etc. to authenticate users.
 */

import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const responseType = url.searchParams.get("response_type");
  const clientId = url.searchParams.get("client_id");
  const redirectUri = url.searchParams.get("redirect_uri");
  const state = url.searchParams.get("state");

  if (!responseType || !redirectUri) {
    return errorResponse("Missing required parameters: response_type, redirect_uri", 400);
  }

  // Store the LLM platform's redirect_uri and state in our own state param
  // so we can recover them after Google OAuth callback
  const oauthState = Buffer.from(JSON.stringify({
    redirect_uri: redirectUri,
    state: state || "",
    client_id: clientId || "",
  })).toString("base64url");

  // Build Google OAuth URL (same client as our app)
  const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  googleAuthUrl.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID!);
  googleAuthUrl.searchParams.set("redirect_uri", `${getBaseUrl(request)}/api/oauth/callback`);
  googleAuthUrl.searchParams.set("response_type", "code");
  googleAuthUrl.searchParams.set("scope", "openid email profile");
  googleAuthUrl.searchParams.set("state", oauthState);
  googleAuthUrl.searchParams.set("access_type", "online");
  googleAuthUrl.searchParams.set("prompt", "select_account");

  return NextResponse.redirect(googleAuthUrl.toString(), 302);
}

function getBaseUrl(request: Request): string {
  const url = new URL(request.url);
  return process.env.NEXTAUTH_URL || `${url.protocol}//${url.host}`;
}
