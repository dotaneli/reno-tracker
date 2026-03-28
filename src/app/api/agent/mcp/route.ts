/**
 * MCP Streamable HTTP Transport — JSON-RPC 2.0 over POST.
 * Handles initialize, tools/list, tools/call.
 * No long-lived SSE (Vercel serverless compatible).
 */

import { resolveAuth, AuthError } from "@/lib/dal";
import { TOOLS, executeTool } from "@/lib/mcp-server";
import { checkRateLimit } from "@/lib/rate-limit";
import { createHash } from "crypto";

const MCP_VERSION = "2024-11-05";
const SERVER_INFO = {
  name: "reno-tracker",
  version: "1.0.0",
};

function jsonRpcResponse(id: string | number | null, result: any) {
  return { jsonrpc: "2.0" as const, id, result };
}

function jsonRpcError(id: string | number | null, code: number, message: string, data?: any) {
  return { jsonrpc: "2.0" as const, id, error: { code, message, ...(data && { data }) } };
}

export async function POST(request: Request) {
  // Rate limit check for Bearer-authenticated requests
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const hash = createHash("sha256").update(token).digest("hex");
    const { allowed, retryAfterMs } = checkRateLimit(hash);
    if (!allowed) {
      return Response.json(
        jsonRpcError(null, -32000, "Rate limit exceeded"),
        { status: 429, headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } }
      );
    }
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json(jsonRpcError(null, -32700, "Parse error"), { status: 400 });
  }

  // Handle batch requests
  if (Array.isArray(body)) {
    const results = await Promise.all(body.map((req: any) => handleSingleRequest(req, request)));
    return Response.json(results, {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  const result = await handleSingleRequest(body, request);
  return Response.json(result, {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}

async function handleSingleRequest(rpc: any, _rawRequest: Request) {
  const id = rpc?.id ?? null;
  const method = rpc?.method;

  if (!method || typeof method !== "string") {
    return jsonRpcError(id, -32600, "Invalid request");
  }

  switch (method) {
    case "initialize":
      return jsonRpcResponse(id, {
        protocolVersion: MCP_VERSION,
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
      });

    case "notifications/initialized":
      // Client acknowledging initialization — no response needed for notifications
      return jsonRpcResponse(id, {});

    case "tools/list":
      return jsonRpcResponse(id, { tools: TOOLS });

    case "tools/call": {
      const toolName = rpc.params?.name;
      const args = rpc.params?.arguments || {};

      if (!toolName) {
        return jsonRpcError(id, -32602, "Missing tool name");
      }

      const tool = TOOLS.find((t) => t.name === toolName);
      if (!tool) {
        return jsonRpcError(id, -32602, `Unknown tool: ${toolName}`);
      }

      try {
        const auth = await resolveAuth();
        const result = await executeTool(toolName, args, auth);
        return jsonRpcResponse(id, {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        });
      } catch (err: any) {
        if (err instanceof AuthError) {
          const code = err.status === 401 ? -32001 : err.status === 403 ? -32003 : err.status === 404 ? -32004 : -32602;
          return jsonRpcError(id, code, err.message);
        }
        console.error(`MCP tool error [${toolName}]:`, err);
        return jsonRpcError(id, -32603, err.message || "Internal error");
      }
    }

    case "ping":
      return jsonRpcResponse(id, {});

    default:
      return jsonRpcError(id, -32601, `Method not found: ${method}`);
  }
}

// Handle CORS preflight
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
}
