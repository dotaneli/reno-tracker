/**
 * Slim OpenAPI 3.1 spec covering the ~15 LLM-relevant endpoints.
 * Serves as documentation + ChatGPT Actions fallback.
 */

const BASE_URL = process.env.NEXTAUTH_URL || "https://reno-tracker-rho.vercel.app";

export function getOpenApiSpec() {
  return {
    openapi: "3.1.0",
    info: {
      title: "Reno Tracker API",
      version: "1.0.0",
      description:
        "Renovation project management API. Manage projects, tasks (nodes in a tree), costs, payment milestones, issues, vendors, and receipts. " +
        "To import unstructured text (WhatsApp messages, quotes), parse it into individual tasks and milestones, then call the appropriate creation endpoints.",
    },
    servers: [{ url: BASE_URL }],
    security: [{ bearerAuth: [] }],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "API Key (rk_...)" },
      },
    },
    paths: {
      "/api/projects": {
        get: {
          operationId: "listProjects",
          summary: "List all projects the user can access",
          responses: { "200": { description: "Array of projects with summary stats" } },
        },
      },
      "/api/projects/{id}": {
        get: {
          operationId: "getProject",
          summary: "Get a single project with full details",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "Project details" } },
        },
        patch: {
          operationId: "updateProject",
          summary: "Update project name or budget",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          requestBody: {
            content: { "application/json": { schema: { type: "object", properties: { name: { type: "string" }, totalBudget: { type: "number" } } } } },
          },
          responses: { "200": { description: "Updated project" } },
        },
      },
      "/api/nodes": {
        get: {
          operationId: "listNodes",
          summary: "List tasks. Use tree=true for nested tree with cost summaries.",
          parameters: [
            { name: "projectId", in: "query", required: true, schema: { type: "string" } },
            { name: "tree", in: "query", schema: { type: "string", enum: ["true"] }, description: "Set to 'true' for nested tree view" },
          ],
          responses: { "200": { description: "Array of nodes (flat or tree)" } },
        },
        post: {
          operationId: "createNode",
          summary: "Create a task or subtask",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["name", "projectId"],
                  properties: {
                    name: { type: "string" }, projectId: { type: "string" },
                    parentId: { type: "string", description: "Parent task ID for nesting" },
                    expectedCost: { type: "number" }, vendorId: { type: "string" }, categoryId: { type: "string" },
                    status: { type: "string", enum: ["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "ON_HOLD", "PENDING", "ORDERED", "DELIVERED", "INSTALLED", "CANCELLED"] },
                  },
                },
              },
            },
          },
          responses: { "201": { description: "Created node" } },
        },
      },
      "/api/nodes/{id}": {
        get: {
          operationId: "getNode",
          summary: "Get a single task with children, milestones, receipts, notes, issues",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "Node details" } },
        },
        patch: {
          operationId: "updateNode",
          summary: "Update task properties",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    name: { type: "string" }, status: { type: "string" },
                    expectedCost: { type: "number" }, actualCost: { type: "number" },
                    vendorId: { type: "string" }, categoryId: { type: "string" },
                    parentId: { type: "string", description: "Move under a different parent (null for root)" },
                  },
                },
              },
            },
          },
          responses: { "200": { description: "Updated node" } },
        },
        delete: {
          operationId: "deleteNode",
          summary: "Delete a task and all subtasks",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { "204": { description: "Deleted" } },
        },
      },
      "/api/nodes/{id}/done": {
        post: {
          operationId: "markNodeDone",
          summary: "Mark task as completed and auto-pay all milestones",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "Completion result" } },
        },
      },
      "/api/nodes/{id}/milestones": {
        get: {
          operationId: "listNodeMilestones",
          summary: "List payment milestones for a task",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "Array of milestones" } },
        },
        post: {
          operationId: "createMilestone",
          summary: "Add a payment milestone. Accepts JSON or FormData.",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object", required: ["label"],
                  properties: {
                    label: { type: "string" }, amount: { type: "number" },
                    percentage: { type: "number", description: "% of task expected cost" },
                    dueDate: { type: "string", format: "date" },
                  },
                },
              },
            },
          },
          responses: { "201": { description: "Created milestone" } },
        },
      },
      "/api/nodes/{id}/milestones/{milestoneId}": {
        patch: {
          operationId: "updateMilestone",
          summary: "Update a milestone. Set status=PAID and paidDate to mark as paid.",
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string" } },
            { name: "milestoneId", in: "path", required: true, schema: { type: "string" } },
          ],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    label: { type: "string" }, amount: { type: "number" },
                    status: { type: "string", enum: ["PENDING", "DUE", "PAID", "OVERDUE"] },
                    paidDate: { type: "string", format: "date" },
                    dueDate: { type: "string", format: "date" },
                  },
                },
              },
            },
          },
          responses: { "200": { description: "Updated milestone" } },
        },
        delete: {
          operationId: "deleteMilestone",
          summary: "Delete a milestone",
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string" } },
            { name: "milestoneId", in: "path", required: true, schema: { type: "string" } },
          ],
          responses: { "204": { description: "Deleted" } },
        },
      },
      "/api/nodes/{id}/receipts": {
        post: {
          operationId: "uploadReceipt",
          summary: "Upload a receipt (PDF/JPEG/PNG, max 5MB). Send as JSON with base64.",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object", required: ["fileName", "fileBase64"],
                  properties: {
                    fileName: { type: "string", description: "e.g. receipt.pdf" },
                    fileBase64: { type: "string", description: "Base64-encoded file" },
                  },
                },
              },
            },
          },
          responses: { "201": { description: "Created receipt" } },
        },
      },
      "/api/issues": {
        get: {
          operationId: "listIssues",
          summary: "List issues, optionally filtered by status",
          parameters: [
            { name: "nodeId", in: "query", schema: { type: "string" } },
            { name: "status", in: "query", schema: { type: "string", enum: ["OPEN", "IN_PROGRESS", "RESOLVED"] } },
          ],
          responses: { "200": { description: "Array of issues" } },
        },
        post: {
          operationId: "createIssue",
          summary: "Log a new issue on a task",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object", required: ["title", "nodeId"],
                  properties: { title: { type: "string" }, nodeId: { type: "string" }, description: { type: "string" } },
                },
              },
            },
          },
          responses: { "201": { description: "Created issue" } },
        },
      },
      "/api/issues/{id}": {
        patch: {
          operationId: "updateIssue",
          summary: "Update/resolve an issue",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { title: { type: "string" }, description: { type: "string" }, status: { type: "string", enum: ["OPEN", "IN_PROGRESS", "RESOLVED"] } },
                },
              },
            },
          },
          responses: { "200": { description: "Updated issue" } },
        },
      },
      "/api/vendors": {
        get: {
          operationId: "listVendors",
          summary: "List vendors for a project",
          parameters: [{ name: "projectId", in: "query", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "Array of vendors" } },
        },
        post: {
          operationId: "createVendor",
          summary: "Add a new vendor/contractor",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object", required: ["name", "projectId"],
                  properties: { name: { type: "string" }, projectId: { type: "string" }, category: { type: "string" }, phone: { type: "string" }, email: { type: "string" } },
                },
              },
            },
          },
          responses: { "201": { description: "Created vendor" } },
        },
      },
      "/api/categories": {
        get: {
          operationId: "listCategories",
          summary: "List task categories for a project",
          parameters: [{ name: "projectId", in: "query", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "Array of categories" } },
        },
      },
      "/api/projects/{id}/milestones": {
        get: {
          operationId: "getProjectMilestones",
          summary: "Get all payment milestones across all tasks in a project",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "Array of milestones with task info" } },
        },
      },
      "/api/me": {
        get: {
          operationId: "getMe",
          summary: "Get current authenticated user info",
          responses: { "200": { description: "User profile with memberships" } },
        },
      },
    },
  };
}
