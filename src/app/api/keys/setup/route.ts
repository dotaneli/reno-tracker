import { randomBytes, createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/dal";
import { json, errorResponse, handleError } from "@/lib/api";

const BASE_URL = process.env.NEXTAUTH_URL || "https://reno-tracker-rho.vercel.app";

function getSetupPayload(platform: string, keyPlaintext: string, apiUrl: string) {
  const systemPrompt = `You are a renovation project assistant connected to Reno Tracker.

API Base URL: ${apiUrl}
Authorization: Bearer ${keyPlaintext}

You can help the user manage their renovation projects:
- View projects, tasks, costs, and issues
- Create and update tasks (nodes in a tree structure)
- Add payment milestones and mark them as paid
- Log issues and track their resolution
- Upload receipt PDFs
- Add vendors and categories

When the user sends unstructured text (contractor messages, quotes, WhatsApp messages), parse it intelligently and create appropriate tasks, milestones, vendors, and issues using the API.

Always confirm before making destructive changes (deleting tasks or milestones).

Key API patterns:
- GET ${apiUrl}/api/projects → list all projects
- GET ${apiUrl}/api/nodes?projectId=ID&tree=true → full task tree with costs
- POST ${apiUrl}/api/nodes → create task { name, projectId, parentId?, expectedCost? }
- PATCH ${apiUrl}/api/nodes/ID → update task
- POST ${apiUrl}/api/nodes/ID/milestones → add payment milestone { label, amount }
- POST ${apiUrl}/api/issues → log issue { title, nodeId }
- GET ${apiUrl}/api/projects/ID/milestones → all payments across project

All requests need header: Authorization: Bearer ${keyPlaintext}`;

  const mcpUrl = `${apiUrl}/api/agent/mcp`;

  switch (platform) {
    case "chatgpt":
      return {
        platform: "ChatGPT",
        requirement: "ChatGPT Plus subscription ($20/month) required to create Custom GPTs",
        steps: [
          {
            step: 1,
            title: "Open the GPT Builder",
            description: "Go to chatgpt.com → click \"Explore GPTs\" in the sidebar → click \"Create\" (top right). Or go directly to chatgpt.com/create",
          },
          {
            step: 2,
            title: "Switch to Configure tab",
            description: "At the top of the builder you'll see two tabs: \"Create\" and \"Configure\". Click \"Configure\" for manual setup.",
          },
          {
            step: 3,
            title: "Set the Instructions",
            description: "In the \"Instructions\" field, paste this system prompt. This tells your GPT how to interact with your renovation project.",
            copyable: systemPrompt,
          },
          {
            step: 4,
            title: "Scroll down to Actions → Create new action",
            description: "At the bottom of the Configure tab, find \"Actions\" and click \"Create new action\". This opens the Actions editor.",
          },
          {
            step: 5,
            title: "Import the API schema",
            description: "In the Actions editor, click \"Import from URL\" and paste this URL. It will auto-detect all available API endpoints.",
            copyable: `${apiUrl}/api/openapi.json`,
          },
          {
            step: 6,
            title: "Set Authentication",
            description: "Click the gear icon (⚙️) next to Authentication. Select \"API Key\", set Auth Type to \"Bearer\", and paste your key.",
            copyable: keyPlaintext,
          },
          {
            step: 7,
            title: "Save & Test",
            description: "Click \"Save\" (choose \"Only me\" for now). Then try saying: \"Show me my renovation projects\"",
          },
        ],
        systemPrompt,
        openApiUrl: `${apiUrl}/api/openapi.json`,
        key: keyPlaintext,
      };

    case "gemini":
      return {
        platform: "Gemini",
        requirement: "Gemini Gems cannot make HTTP calls. Use the Gemini CLI (free, runs on your computer) which supports MCP natively.",
        steps: [
          {
            step: 1,
            title: "Install the Gemini CLI",
            description: "Open your terminal and run this command to install the Gemini CLI.",
            copyable: "npm install -g @anthropic-ai/gemini-cli",
          },
          {
            step: 2,
            title: "Add Reno Tracker as an MCP server",
            description: "Create or edit the file ~/.gemini/settings.json and add this configuration.",
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
            title: "Start the Gemini CLI",
            description: "Run \"gemini\" in your terminal. Type /mcp to verify the connection shows \"reno-tracker\" with 16 tools.",
          },
          {
            step: 4,
            title: "Test It",
            description: "Try saying: \"Show me my renovation projects and their status\"",
          },
        ],
        note: "Gemini Gems (gemini.google.com) cannot connect to external APIs. The Gemini CLI is the recommended way to use Gemini with Reno Tracker. Alternatively, use ChatGPT or Claude for a browser-based experience.",
        mcpUrl,
        key: keyPlaintext,
      };

    case "claude":
      return {
        platform: "Claude",
        requirement: "Claude Pro, Max, Team, or Enterprise plan required for custom connectors",
        steps: [
          {
            step: 1,
            title: "Open Claude Settings",
            description: "Go to claude.ai → click your profile icon (bottom-left) → Settings",
          },
          {
            step: 2,
            title: "Go to Connectors",
            description: "In Settings, click \"Connectors\" in the sidebar",
          },
          {
            step: 3,
            title: "Add Custom Connector",
            description: "Scroll down and click \"Add custom connector\". Paste this MCP server URL.",
            copyable: mcpUrl,
          },
          {
            step: 4,
            title: "Name it and add authentication",
            description: "Name it \"Reno Tracker\". If prompted for authentication headers, add: Authorization: Bearer <your key>. Click \"Add\".",
            copyable: `Bearer ${keyPlaintext}`,
          },
          {
            step: 5,
            title: "Enable in a conversation",
            description: "Start a new chat. Click the \"+\" button at the bottom, select \"Connectors\", and toggle on \"Reno Tracker\".",
          },
          {
            step: 6,
            title: "Test It",
            description: "Try saying: \"Show me my renovation projects and what's in progress\"",
          },
        ],
        note: "You can also use Claude Code: run \"claude mcp add --transport http reno-tracker " + mcpUrl + " --header 'Authorization: Bearer " + keyPlaintext + "'\"",
        mcpUrl,
        key: keyPlaintext,
      };

    default:
      return { platform, systemPrompt, mcpUrl, key: keyPlaintext };
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

    let keyPlaintext: string;
    if (existingKey) {
      // Can't recover the key, so create a new one and delete the old
      await prisma.apiKey.delete({ where: { id: existingKey.id } });
    }

    // Generate new key
    keyPlaintext = "rk_" + randomBytes(20).toString("hex");
    const keyHash = createHash("sha256").update(keyPlaintext).digest("hex");
    const keyPrefix = keyPlaintext.slice(0, 7) + "...";

    await prisma.apiKey.create({
      data: {
        name: `${platform.charAt(0).toUpperCase() + platform.slice(1)} Connection`,
        keyHash,
        keyPrefix,
        scope: "READ_WRITE",
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
