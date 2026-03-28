import { randomBytes, createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/dal";
import { json, errorResponse, handleError } from "@/lib/api";

const BASE_URL = process.env.NEXTAUTH_URL || process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

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

  switch (platform) {
    case "chatgpt":
      return {
        platform: "ChatGPT",
        steps: [
          { step: 1, title: "Open ChatGPT", description: "Go to chatgpt.com → Explore GPTs → Create a GPT" },
          { step: 2, title: "Configure Actions", description: "In Configure tab → scroll to Actions → Create new action" },
          { step: 3, title: "Import Schema", description: `Click "Import from URL" and paste this URL`, copyable: `${apiUrl}/api/openapi.json` },
          { step: 4, title: "Set Authentication", description: "Authentication → API Key → Auth Type: Bearer → paste your key", copyable: keyPlaintext },
          { step: 5, title: "Set Instructions", description: "Paste this as the GPT instructions", copyable: systemPrompt },
          { step: 6, title: "Test It", description: 'Try saying: "Show me my renovation projects"' },
        ],
        systemPrompt,
        openApiUrl: `${apiUrl}/api/openapi.json`,
        key: keyPlaintext,
      };

    case "gemini":
      return {
        platform: "Gemini",
        steps: [
          { step: 1, title: "Open Gemini", description: "Go to gemini.google.com" },
          { step: 2, title: "Create a Gem", description: 'Click your profile → Gems → Create Gem (or "New Gem")' },
          { step: 3, title: "Paste Instructions", description: "Paste this as the Gem instructions — it includes your API key", copyable: systemPrompt },
          { step: 4, title: "Test It", description: 'Try saying: "Show me my renovation projects"' },
        ],
        systemPrompt,
        key: keyPlaintext,
      };

    case "claude":
      return {
        platform: "Claude",
        steps: [
          { step: 1, title: "Open Claude", description: "Go to claude.ai" },
          { step: 2, title: "Create a Project", description: 'Click Projects → Create Project → name it "Reno Tracker"' },
          { step: 3, title: "Set Project Instructions", description: "In project settings, paste this as the system prompt", copyable: systemPrompt },
          { step: 4, title: "Test It", description: 'Start a chat in the project and say: "Show me my renovation projects"' },
        ],
        systemPrompt,
        key: keyPlaintext,
      };

    default:
      return { platform, systemPrompt, key: keyPlaintext };
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
