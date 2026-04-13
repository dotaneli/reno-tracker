import { resolveAuth, requireProjectAccess, requireNodeAccess, AuthError } from "@/lib/dal";
import { handleError, errorResponse } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { TOOLS, executeTool } from "@/lib/mcp-server";
import { uploadBase64File } from "@/lib/file-upload";
import { logAction } from "@/lib/actionlog";
import { log } from "@/lib/logger";
import Anthropic from "@anthropic-ai/sdk";

// Allow up to 60 seconds for AI response with tool calls
export const maxDuration = 60;

const RATE_LIMIT_PER_DAY = 50;
const MAX_HISTORY = 20;
const MODEL = "claude-sonnet-4-20250514";

interface ChatRequestBody {
  message: string;
  projectId: string;
  context?: { page: string; nodeId?: string };
  file?: { name: string; type: string; base64: string }; // PDF/image upload
}

// ── CORS headers (same as proxy.ts pattern) ──

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function POST(request: Request) {
  try {
    const auth = await resolveAuth();
    const { userId } = auth;

    const body: ChatRequestBody = await request.json();
    if (!body.message?.trim()) return errorResponse("message is required", 400);
    if (!body.projectId?.trim()) return errorResponse("projectId is required", 400);

    // Verify project access
    await requireProjectAccess(userId, body.projectId);

    // Rate limiting: 50 messages per day per user+project
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const messageCount = await prisma.chatMessage.count({
      where: {
        userId,
        projectId: body.projectId,
        role: "user",
        createdAt: { gte: dayAgo },
      },
    });
    if (messageCount >= RATE_LIMIT_PER_DAY) {
      return errorResponse("Rate limit exceeded: 50 messages per day per project", 429);
    }

    // Load project info for system prompt
    const project = await prisma.project.findUnique({
      where: { id: body.projectId },
      select: { name: true },
    });
    if (!project) return errorResponse("Project not found", 404);

    // Load last 20 messages for conversation history
    const history = await prisma.chatMessage.findMany({
      where: { userId, projectId: body.projectId },
      orderBy: { createdAt: "desc" },
      take: MAX_HISTORY,
      select: { role: true, content: true },
    });
    history.reverse(); // oldest first

    // Build system prompt
    const pageName = body.context?.page || "unknown";
    const nodeCtx = body.context?.nodeId
      ? ` They are viewing a specific task (nodeId: ${body.context.nodeId}).`
      : "";
    const systemPrompt = `You are the Reno Tracker AI assistant for project "${project.name}" (projectId: ${body.projectId}).
The user is on the ${pageName} page.${nodeCtx}
IMPORTANT: You are scoped to this project ONLY. Always use projectId "${body.projectId}" when calling tools.
Help manage tasks, costs, payments, vendors, and issues. Be concise. Use markdown for readability.
Use Hebrew if the user writes in Hebrew.

VISUAL WIDGETS: You can render rich dashboard widgets by outputting fenced code blocks with language "widget" containing JSON. Available widget types:

1. Progress bar:
\`\`\`widget
{"type":"progress","label":"Budget Used","value":450000,"max":750000,"unit":"ILS"}
\`\`\`

2. Stat cards (grid of metrics):
\`\`\`widget
{"type":"stats","items":[{"label":"Total Cost","value":"₪450,000"},{"label":"Paid","value":"₪320,000","color":"green"},{"label":"Remaining","value":"₪130,000","color":"orange"},{"label":"Overdue","value":"2","color":"red"}]}
\`\`\`

3. Status list (tasks/items with status badges):
\`\`\`widget
{"type":"status-list","items":[{"name":"Kitchen Cabinets","status":"COMPLETED","detail":"₪85,000"},{"name":"Plumbing","status":"IN_PROGRESS","detail":"₪22,000"}]}
\`\`\`

Use widgets when showing summaries, financial breakdowns, task status overviews, or payment schedules. Combine widgets with text explanations. Use regular markdown tables for detailed data.${
  body.file?.base64
    ? `\n\nATTACHED FILE: The user has attached a file named "${body.file.name}" (${body.file.type}) with this message. To save it as a receipt for a task, call the \`attach_receipt\` tool with the target nodeId — do NOT try to pass any file contents, they are handled automatically. Existing receipts can be listed with \`list_receipts\` and removed with \`delete_receipt\`.`
    : ""
}`;

    // Build messages array
    const messages: Anthropic.MessageParam[] = [
      ...history.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];

    // Build current user message (may include file attachment)
    if (body.file?.base64) {
      const isImage = body.file.type.startsWith("image/");
      const content: Anthropic.ContentBlockParam[] = [];
      if (isImage) {
        content.push({
          type: "image",
          source: { type: "base64", media_type: body.file.type as any, data: body.file.base64 },
        });
      } else {
        // PDF or other document — send as document
        content.push({
          type: "document",
          source: { type: "base64", media_type: body.file.type as any, data: body.file.base64 },
        });
      }
      content.push({ type: "text", text: body.message.trim() || `Analyze this ${body.file.name}` });
      messages.push({ role: "user", content });
    } else {
      messages.push({ role: "user", content: body.message.trim() });
    }

    // Convert MCP tools to Anthropic API format (exclude list_projects — scoped to one project)
    const tools: Anthropic.Tool[] = TOOLS
      .filter((t) => t.name !== "list_projects" && t.name !== "get_recent_logs")
      .map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.inputSchema as Anthropic.Tool.InputSchema,
      }));

    // When the user attaches a file, expose a chat-only tool that saves it as a receipt.
    // Claude cannot re-emit the base64 itself, so we inject it server-side from body.file.
    if (body.file?.base64) {
      tools.push({
        name: "attach_receipt",
        description: `Save the file the user just attached ("${body.file.name}", ${body.file.type}) as a receipt. ALWAYS pass nodeId. If the receipt is for a specific payment milestone, ALSO pass milestoneId — this attaches the file directly to that payment so it shows inline with the milestone. Otherwise it is saved as a task-level receipt. The file content is handled automatically.`,
        input_schema: {
          type: "object",
          properties: {
            nodeId: { type: "string", description: "The task ID the receipt belongs to (always required)" },
            milestoneId: { type: "string", description: "Optional: attach to a specific payment milestone instead of the task as a whole" },
          },
          required: ["nodeId"],
        } as Anthropic.Tool.InputSchema,
      });
    }

    // Save user message now (before streaming)
    await prisma.chatMessage.create({
      data: {
        role: "user",
        content: body.message.trim(),
        context: body.context ?? undefined,
        userId,
        projectId: body.projectId,
      },
    });

    // Create the Anthropic client
    const client = new Anthropic();

    // We need an agentic loop: call Claude, handle tool_use, call again, etc.
    // Stream the final text response back to the client via SSE.
    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        try {
          let currentMessages = [...messages];
          let finalText = "";
          let toolCallsLog: Array<{ name: string; input: any; result: any }> = [];

          // Agentic loop: max 3 rounds of tool use to prevent excessive API calls
          let rounds = 0;
          const MAX_ROUNDS = 3;
          while (rounds < MAX_ROUNDS) {
            rounds++;
            const stream = client.messages.stream({
              model: MODEL,
              max_tokens: 4096,
              system: systemPrompt,
              messages: currentMessages,
              tools,
            });

            // Collect the full response while streaming text deltas
            let responseText = "";
            const toolUseBlocks: Array<{ id: string; name: string; input: any }> = [];
            let currentToolUse: { id: string; name: string; inputJson: string } | null = null;

            for await (const event of stream) {
              if (event.type === "content_block_start") {
                const block = event.content_block;
                if (block.type === "text") {
                  // Text block starting
                } else if (block.type === "tool_use") {
                  currentToolUse = { id: block.id, name: block.name, inputJson: "" };
                }
              } else if (event.type === "content_block_delta") {
                const delta = event.delta;
                if (delta.type === "text_delta") {
                  responseText += delta.text;
                  // Stream the text delta as SSE
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ type: "text", text: delta.text })}\n\n`)
                  );
                } else if (delta.type === "input_json_delta" && currentToolUse) {
                  currentToolUse.inputJson += delta.partial_json;
                }
              } else if (event.type === "content_block_stop") {
                if (currentToolUse) {
                  const input = currentToolUse.inputJson
                    ? JSON.parse(currentToolUse.inputJson)
                    : {};
                  toolUseBlocks.push({
                    id: currentToolUse.id,
                    name: currentToolUse.name,
                    input,
                  });
                  currentToolUse = null;
                }
              }
            }

            // Get the final message to check stop_reason
            const finalMessage = await stream.finalMessage();

            if (finalMessage.stop_reason === "tool_use" && toolUseBlocks.length > 0) {
              // Notify client that tools are being called
              for (const tool of toolUseBlocks) {
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ type: "tool_call", name: tool.name })}\n\n`
                  )
                );
              }

              // Build the assistant message content blocks for the next turn
              const assistantContent: Anthropic.ContentBlockParam[] = [];
              if (responseText) {
                assistantContent.push({ type: "text", text: responseText });
              }
              for (const tool of toolUseBlocks) {
                assistantContent.push({
                  type: "tool_use",
                  id: tool.id,
                  name: tool.name,
                  input: tool.input,
                });
              }

              // Execute each tool and build tool_result blocks
              const toolResults: Anthropic.ToolResultBlockParam[] = [];
              for (const tool of toolUseBlocks) {
                try {
                  let result: any;
                  if (tool.name === "attach_receipt") {
                    // Chat-only tool: save the pending file from body.file onto the given node (or milestone)
                    if (!body.file?.base64) throw new Error("No file is attached to this request");
                    const nodeId: string = tool.input?.nodeId;
                    const milestoneId: string | undefined = tool.input?.milestoneId;
                    if (!nodeId) throw new Error("nodeId is required");
                    const { projectId } = await requireNodeAccess(userId, nodeId, ["OWNER", "EDITOR"]);
                    if (milestoneId) {
                      // Verify the milestone belongs to this node
                      const ms = await prisma.paymentMilestone.findUnique({ where: { id: milestoneId }, select: { nodeId: true } });
                      if (!ms || ms.nodeId !== nodeId) throw new Error("milestoneId does not belong to this node");
                      const up = await uploadBase64File(body.file.name, body.file.base64, `receipts/${nodeId}`);
                      const updated = await prisma.paymentMilestone.update({
                        where: { id: milestoneId },
                        data: { receiptUrl: up.url, receiptName: up.name },
                      });
                      await logAction(projectId, userId, "UPDATE", "milestone", milestoneId, null, updated);
                      result = updated;
                    } else {
                      const up = await uploadBase64File(body.file.name, body.file.base64, `receipts/${nodeId}`);
                      const receipt = await prisma.receipt.create({
                        data: { fileUrl: up.url, fileName: up.name, fileSize: up.size, nodeId },
                      });
                      await logAction(projectId, userId, "CREATE", "receipt", receipt.id, null, receipt);
                      result = receipt;
                    }
                  } else {
                    result = await executeTool(tool.name, tool.input, auth);
                  }
                  toolResults.push({
                    type: "tool_result",
                    tool_use_id: tool.id,
                    content: JSON.stringify(result),
                  });
                  toolCallsLog.push({ name: tool.name, input: tool.input, result });
                } catch (err) {
                  const errMsg = err instanceof Error ? err.message : String(err);
                  toolResults.push({
                    type: "tool_result",
                    tool_use_id: tool.id,
                    is_error: true,
                    content: errMsg,
                  });
                  toolCallsLog.push({ name: tool.name, input: tool.input, result: { error: errMsg } });
                }
              }

              // Add assistant turn + tool results for next iteration
              currentMessages = [
                ...currentMessages,
                { role: "assistant", content: assistantContent },
                { role: "user", content: toolResults },
              ];

              // Continue loop — Claude will process tool results
              finalText += responseText;
              continue;
            }

            // No more tool calls — we're done
            finalText += responseText;
            break;
          }

          // Save assistant message BEFORE closing stream (Vercel kills function after response ends)
          await prisma.chatMessage.create({
            data: {
              role: "assistant",
              content: finalText,
              context: toolCallsLog.length > 0 ? { toolCalls: toolCallsLog } : undefined,
              userId,
              projectId: body.projectId,
            },
          });

          // Send done event and close
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
          controller.close();
        } catch (err) {
          log("error", "chat_stream_error", {
            error: err instanceof Error ? err.message : String(err),
            userId,
            projectId: body.projectId,
          });
          try {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "error", error: "An error occurred while generating a response." })}\n\n`
              )
            );
          } catch {
            // controller may already be closed
          }
          controller.close();
        }
      },
    });

    return new Response(readable, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        ...corsHeaders,
      },
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return errorResponse(err.message, err.status);
    }
    log("error", "chat_error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return handleError(err);
  }
}
