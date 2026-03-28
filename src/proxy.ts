import { NextRequest, NextResponse } from "next/server";

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Public routes — no auth needed
  if (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/translate") ||
    pathname.startsWith("/api/openapi") ||
    pathname.startsWith("/_next") ||
    pathname === "/login" ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // CORS preflight for agent requests
  if (req.method === "OPTIONS" && pathname.startsWith("/api/")) {
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Authorization, Content-Type",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  // For API routes, require either session cookie or Bearer token
  if (pathname.startsWith("/api/")) {
    const sessionToken =
      req.cookies.get("authjs.session-token")?.value ||
      req.cookies.get("__Secure-authjs.session-token")?.value;
    const bearerToken = req.headers.get("authorization")?.startsWith("Bearer ")
      ? req.headers.get("authorization")
      : null;

    if (!sessionToken && !bearerToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Add CORS headers for Bearer-authenticated requests (LLM platforms)
    if (bearerToken) {
      const response = NextResponse.next();
      response.headers.set("Access-Control-Allow-Origin", "*");
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
