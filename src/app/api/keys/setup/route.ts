import { randomBytes, createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/dal";
import { json, errorResponse, handleError } from "@/lib/api";

const BASE_URL = process.env.NEXTAUTH_URL || "https://reno-tracker-rho.vercel.app";

function getSetupPayload(platform: string, keyPlaintext: string, apiUrl: string) {
  const mcpUrl = `${apiUrl}/api/agent/mcp`;

  switch (platform) {
    case "chatgpt":
      return {
        platform: "ChatGPT",
        requirement: "ChatGPT Plus, Team, or Enterprise required to create Custom GPTs with Actions",
        note: "Note: OpenAI deprecated GPT Actions in 2024, but they still work for existing and new Custom GPTs. This is currently the best way to connect ChatGPT to external APIs.",
        steps: [
          {
            step: 1,
            title: "Open the GPT Builder",
            description: "Go to chatgpt.com → Explore GPTs → Create (top right). Or go directly to chatgpt.com/create",
          },
          {
            step: 2,
            title: "Switch to Configure tab",
            description: "Click \"Configure\" at the top of the builder for manual setup.",
          },
          {
            step: 3,
            title: "Set the name and instructions",
            description: "Name it \"Reno Tracker\". In Instructions, paste this system prompt:",
            copyable: `You are a renovation project assistant connected to Reno Tracker. Help the user manage their renovation: view projects/tasks/costs, create tasks, add payments, log issues, upload receipts. When the user sends unstructured text (contractor messages, quotes), parse it and create appropriate tasks and milestones. Always confirm before deleting anything.`,
          },
          {
            step: 4,
            title: "Add Actions → Create new action",
            description: "Scroll to \"Actions\" at the bottom, click \"Create new action\". In the Actions editor, click \"Import from URL\" and paste:",
            copyable: `${apiUrl}/api/openapi.json`,
          },
          {
            step: 5,
            title: "Set Authentication",
            description: "Click the gear icon (⚙️) next to Authentication. Select \"API Key\", Auth Type = \"Bearer\", and paste your key:",
            copyable: keyPlaintext,
          },
          {
            step: 6,
            title: "Save & Test",
            description: "Click \"Save\" → \"Only me\". Then try: \"Show me my renovation projects\"",
          },
        ],
        key: keyPlaintext,
        testUrl: `${apiUrl}/api/agent/mcp/test`,
      };

    case "gemini":
      return {
        platform: "Gemini CLI",
        requirement: "Free — requires Node.js and a terminal. Read-only access.",
        note: "Gemini web (gemini.google.com) cannot connect to external APIs. The Gemini CLI supports MCP but with read-only access — it can view your projects, tasks, and costs but cannot create or update data. For full read & write access, use Claude or ChatGPT.",
        steps: [
          {
            step: 1,
            title: "Install Gemini CLI",
            description: "Open your terminal and run:",
            copyable: "npm install -g @google/gemini-cli",
          },
          {
            step: 2,
            title: "Create the MCP config file",
            description: "Create or edit ~/.gemini/settings.json and paste this configuration:",
            copyable: JSON.stringify({
              mcpServers: {
                "reno-tracker": {
                  httpUrl: mcpUrl,
                  headers: { Authorization: `Bearer ${keyPlaintext}` },
                },
              },
            }, null, 2),
          },
          {
            step: 3,
            title: "Launch Gemini CLI",
            description: "Run \"gemini\" in your terminal. Type /mcp to verify \"reno-tracker\" appears with 17 tools.",
            copyable: "gemini",
          },
          {
            step: 4,
            title: "Test it",
            description: "Try: \"Show me my renovation projects and what's in progress\"",
          },
        ],
        key: keyPlaintext,
        mcpUrl,
        testUrl: `${apiUrl}/api/agent/mcp/test`,
      };

    case "claude":
      return {
        platform: "Claude",
        requirement: "Claude Pro, Max, Team, or Enterprise plan for custom connectors on claude.ai. Claude Code works on all plans.",
        steps: [
          {
            step: 1,
            title: "Option A: Claude Code (easiest — one command)",
            description: "If you have Claude Code installed, paste this in your terminal:",
            copyable: `claude mcp add --transport http reno-tracker ${mcpUrl} --header "Authorization: Bearer ${keyPlaintext}"`,
          },
          {
            step: 2,
            title: "Option B: Claude.ai (web)",
            description: "Go to claude.ai → Profile → Settings → Connectors → \"Add custom connector\". Paste the MCP URL:",
            copyable: mcpUrl,
          },
          {
            step: 3,
            title: "Add authentication",
            description: "When prompted for authentication, add the Authorization header with your Bearer token:",
            copyable: `Bearer ${keyPlaintext}`,
          },
          {
            step: 4,
            title: "Option C: Claude Desktop app",
            description: "Edit your Claude Desktop config file and add this MCP server:",
            copyable: JSON.stringify({
              mcpServers: {
                "reno-tracker": {
                  url: mcpUrl,
                  headers: { Authorization: `Bearer ${keyPlaintext}` },
                },
              },
            }, null, 2),
          },
          {
            step: 5,
            title: "Test it",
            description: "Start a new conversation and try: \"Show me my renovation projects\"",
          },
        ],
        key: keyPlaintext,
        mcpUrl,
        testUrl: `${apiUrl}/api/agent/mcp/test`,
      };

    default:
      return { platform, mcpUrl, key: keyPlaintext, testUrl: `${apiUrl}/api/agent/mcp/test` };
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await requireUser();
    const body = await request.json();
    const { platform } = body;

    if (!platform || !["chatgpt", "gemini", "claude"].includes(platform)) {
      return errorResponse("platform must be chatgpt, gemini, or claude", 400);
    }

    // Check if a key already exists for this platform
    const existingKey = await prisma.apiKey.findFirst({
      where: { userId, name: `${platform.charAt(0).toUpperCase() + platform.slice(1)} Connection` },
    });

    if (existingKey) {
      // Can't recover the key, so create a new one and delete the old
      await prisma.apiKey.delete({ where: { id: existingKey.id } });
    }

    // Generate new key
    const keyPlaintext = "rk_" + randomBytes(20).toString("hex");
    const keyHash = createHash("sha256").update(keyPlaintext).digest("hex");
    const keyPrefix = keyPlaintext.slice(0, 7) + "...";

    const scope = platform === "gemini" ? "READ_ONLY" : "READ_WRITE";
    await prisma.apiKey.create({
      data: {
        name: `${platform.charAt(0).toUpperCase() + platform.slice(1)} Connection`,
        keyHash,
        keyPrefix,
        scope: scope as any,
        userId,
      },
    });

    const apiUrl = BASE_URL.replace(/\/$/, "");
    const payload = getSetupPayload(platform, keyPlaintext, apiUrl);

    return json(payload);
  } catch (err) {
    return handleError(err);
  }
}
