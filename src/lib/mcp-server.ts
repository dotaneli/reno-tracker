/**
 * MCP Server for Reno Tracker — Tools only (v1).
 * Handles tool definitions and execution for LLM agents.
 */

import { prisma } from "./prisma";
import { resolveAuth, requireProjectAccess, getUserProjectIds, AuthError, type AuthResult } from "./dal";
import { logAction } from "./actionlog";
import { uploadBase64File } from "./file-upload";
import type { ApiKeyScope } from "../generated/prisma/client";

// ── Tool definitions ──

export interface McpTool {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
}

export const TOOLS: McpTool[] = [
  {
    name: "list_projects",
    description: "List all renovation projects the user has access to, with summary stats (budget, node count, member count).",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "get_project_tree",
    description: "Get the full task tree for a project, including all nested tasks with their status, costs, vendors, categories, and payment summaries. This is the primary way to understand what's in a project.",
    inputSchema: {
      type: "object",
      properties: { projectId: { type: "string", description: "The project ID" } },
      required: ["projectId"],
    },
  },
  {
    name: "get_financial_summary",
    description: "Get a financial breakdown for a project: total budget, total expected cost, total paid, total milestoned, remaining payments, budget remaining, and overdue milestones.",
    inputSchema: {
      type: "object",
      properties: { projectId: { type: "string", description: "The project ID" } },
      required: ["projectId"],
    },
  },
  {
    name: "list_issues",
    description: "List all issues (problems, defects, complaints) for a project, optionally filtered by status (OPEN, IN_PROGRESS, RESOLVED).",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "The project ID" },
        status: { type: "string", enum: ["OPEN", "IN_PROGRESS", "RESOLVED"], description: "Optional status filter" },
      },
      required: ["projectId"],
    },
  },
  {
    name: "list_vendors",
    description: "List all vendors (contractors, suppliers) for a project.",
    inputSchema: {
      type: "object",
      properties: { projectId: { type: "string", description: "The project ID" } },
      required: ["projectId"],
    },
  },
  {
    name: "list_categories",
    description: "List all task categories for a project.",
    inputSchema: {
      type: "object",
      properties: { projectId: { type: "string", description: "The project ID" } },
      required: ["projectId"],
    },
  },
  {
    name: "create_node",
    description: "Create a new task or subtask in the project tree. Use parentId to nest under an existing task. Provide expectedCost for budgeting.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string" },
        name: { type: "string", description: "Task name" },
        parentId: { type: "string", description: "Parent task ID (omit for root-level task)" },
        expectedCost: { type: "number", description: "Expected cost in ILS" },
        vendorId: { type: "string", description: "Vendor/contractor ID" },
        categoryId: { type: "string", description: "Category ID" },
        status: { type: "string", enum: ["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "ON_HOLD", "PENDING", "ORDERED", "DELIVERED", "INSTALLED", "CANCELLED"] },
      },
      required: ["projectId", "name"],
    },
  },
  {
    name: "update_node",
    description: "Update an existing task's properties (name, status, cost, vendor, category, dates).",
    inputSchema: {
      type: "object",
      properties: {
        nodeId: { type: "string" },
        name: { type: "string" },
        status: { type: "string", enum: ["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "ON_HOLD", "PENDING", "ORDERED", "DELIVERED", "INSTALLED", "CANCELLED"] },
        expectedCost: { type: "number" },
        actualCost: { type: "number" },
        vendorId: { type: "string" },
        categoryId: { type: "string" },
        parentId: { type: "string", description: "Move task under a different parent (null for root)" },
      },
      required: ["nodeId"],
    },
  },
  {
    name: "delete_node",
    description: "Delete a task and all its subtasks. This is destructive and cannot be easily undone.",
    inputSchema: {
      type: "object",
      properties: { nodeId: { type: "string" } },
      required: ["nodeId"],
    },
  },
  {
    name: "mark_node_done",
    description: "Mark a task as completed and automatically mark all its unpaid payment milestones as paid.",
    inputSchema: {
      type: "object",
      properties: { nodeId: { type: "string" } },
      required: ["nodeId"],
    },
  },
  {
    name: "create_milestone",
    description: "Add a payment milestone to a task. Specify either a fixed amount or a percentage of the task's expected cost.",
    inputSchema: {
      type: "object",
      properties: {
        nodeId: { type: "string" },
        label: { type: "string", description: "Milestone name (e.g., 'Deposit', '50% completion')" },
        amount: { type: "number", description: "Fixed amount in ILS" },
        percentage: { type: "number", description: "Percentage of task expected cost (alternative to amount)" },
        dueDate: { type: "string", description: "Due date (ISO 8601)" },
      },
      required: ["nodeId", "label"],
    },
  },
  {
    name: "update_milestone",
    description: "Update a payment milestone. Use status 'PAID' and set paidDate to mark as paid.",
    inputSchema: {
      type: "object",
      properties: {
        nodeId: { type: "string", description: "The task ID the milestone belongs to" },
        milestoneId: { type: "string" },
        label: { type: "string" },
        amount: { type: "number" },
        status: { type: "string", enum: ["PENDING", "DUE", "PAID", "OVERDUE"] },
        paidDate: { type: "string", description: "Date paid (ISO 8601)" },
        dueDate: { type: "string", description: "Due date (ISO 8601)" },
      },
      required: ["nodeId", "milestoneId"],
    },
  },
  {
    name: "create_issue",
    description: "Log a new issue (problem, defect, complaint) on a specific task.",
    inputSchema: {
      type: "object",
      properties: {
        nodeId: { type: "string" },
        title: { type: "string" },
        description: { type: "string" },
      },
      required: ["nodeId", "title"],
    },
  },
  {
    name: "update_issue",
    description: "Update an issue's status or details. Set status to RESOLVED to close it.",
    inputSchema: {
      type: "object",
      properties: {
        issueId: { type: "string" },
        title: { type: "string" },
        description: { type: "string" },
        status: { type: "string", enum: ["OPEN", "IN_PROGRESS", "RESOLVED"] },
      },
      required: ["issueId"],
    },
  },
  {
    name: "create_vendor",
    description: "Add a new vendor (contractor, supplier) to a project.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string" },
        name: { type: "string" },
        category: { type: "string", description: "Vendor specialty (e.g., plumbing, electrical)" },
        phone: { type: "string" },
        email: { type: "string" },
      },
      required: ["projectId", "name"],
    },
  },
  {
    name: "upload_receipt",
    description: "Upload a receipt PDF or image for a task. File must be base64-encoded, max 5MB, PDF/JPEG/PNG only.",
    inputSchema: {
      type: "object",
      properties: {
        nodeId: { type: "string" },
        fileName: { type: "string", description: "File name with extension (e.g., receipt.pdf)" },
        fileBase64: { type: "string", description: "Base64-encoded file content" },
      },
      required: ["nodeId", "fileName", "fileBase64"],
    },
  },
];

// ── Scope checking ──

const READ_TOOLS = new Set(["list_projects", "get_project_tree", "get_financial_summary", "list_issues", "list_vendors", "list_categories"]);

function requireScope(auth: AuthResult, toolName: string) {
  if (auth.type !== "apiKey") return; // session users have full access
  if (READ_TOOLS.has(toolName)) return; // read tools allowed for all scopes
  if (auth.scope === "READ_ONLY") {
    throw new AuthError("This API key is read-only. Write operations require a READ_WRITE or ADMIN key.", 403);
  }
}

function checkProjectScope(auth: AuthResult, projectId: string) {
  if (auth.type === "apiKey" && auth.projectId && auth.projectId !== projectId) {
    throw new AuthError("This API key is restricted to a different project", 403);
  }
}

// ── Tool execution ──

export async function executeTool(toolName: string, args: Record<string, any>, auth: AuthResult): Promise<any> {
  requireScope(auth, toolName);
  const { userId } = auth;
  const apiKeyId = auth.type === "apiKey" ? auth.keyId : null;

  switch (toolName) {
    case "list_projects": {
      const projectIds = await getUserProjectIds(userId);
      const projects = await prisma.project.findMany({
        where: { id: { in: projectIds } },
        include: {
          _count: { select: { nodes: true, members: true, floors: true } },
        },
      });
      return projects.map((p) => ({
        id: p.id,
        name: p.name,
        totalBudget: Number(p.totalBudget),
        expectedStartDate: p.expectedStartDate,
        expectedEndDate: p.expectedEndDate,
        nodeCount: p._count.nodes,
        memberCount: p._count.members,
        floorCount: p._count.floors,
      }));
    }

    case "get_project_tree": {
      const { projectId } = args;
      checkProjectScope(auth, projectId);
      await requireProjectAccess(userId, projectId);

      const allNodes = await prisma.projectNode.findMany({
        where: { projectId },
        include: {
          vendor: { select: { id: true, name: true } },
          category: { select: { id: true, name: true } },
          milestones: { select: { amount: true, status: true, label: true, dueDate: true, paidDate: true } },
          _count: { select: { children: true, issues: true, receipts: true, notes: true } },
        },
        orderBy: { sortOrder: "asc" },
      });

      // Build tree
      const nodeMap = new Map<string, any>();
      for (const n of allNodes) {
        const paid = n.milestones.filter((m: any) => m.status === "PAID").reduce((s: number, m: any) => s + Number(m.amount), 0);
        const totalMs = n.milestones.reduce((s: number, m: any) => s + Number(m.amount), 0);
        nodeMap.set(n.id, {
          id: n.id, name: n.name, status: n.status, expectedCost: n.expectedCost ? Number(n.expectedCost) : null,
          actualCost: n.actualCost ? Number(n.actualCost) : null,
          vendor: n.vendor, category: n.category, milestones: n.milestones.map((m: any) => ({ ...m, amount: Number(m.amount) })),
          totalPaid: paid, totalMilestoned: totalMs,
          issueCount: n._count.issues, receiptCount: n._count.receipts, noteCount: n._count.notes,
          children: [],
        });
      }
      const roots: any[] = [];
      for (const n of allNodes) {
        const node = nodeMap.get(n.id)!;
        if (n.parentId && nodeMap.has(n.parentId)) {
          nodeMap.get(n.parentId)!.children.push(node);
        } else {
          roots.push(node);
        }
      }
      return roots;
    }

    case "get_financial_summary": {
      const { projectId } = args;
      checkProjectScope(auth, projectId);
      await requireProjectAccess(userId, projectId);

      const project = await prisma.project.findUnique({ where: { id: projectId }, select: { totalBudget: true } });
      const nodes = await prisma.projectNode.findMany({ where: { projectId }, select: { expectedCost: true } });
      const milestones = await prisma.paymentMilestone.findMany({
        where: { node: { projectId } },
        select: { amount: true, status: true, dueDate: true },
      });

      const totalBudget = Number(project?.totalBudget || 0);
      const totalCost = nodes.reduce((s, n) => s + Number(n.expectedCost || 0), 0);
      const totalPaid = milestones.filter((m) => m.status === "PAID").reduce((s, m) => s + Number(m.amount), 0);
      const totalMilestoned = milestones.reduce((s, m) => s + Number(m.amount), 0);
      const overdue = milestones.filter((m) => m.status !== "PAID" && m.dueDate && m.dueDate < new Date()).length;

      return {
        totalBudget, totalCost, totalPaid, totalMilestoned,
        remainingToPay: totalCost - totalPaid,
        unscheduled: totalCost - totalMilestoned,
        budgetRemaining: totalBudget - totalCost,
        paidPercent: totalCost > 0 ? Math.round((totalPaid / totalCost) * 100) : 0,
        costPercent: totalBudget > 0 ? Math.round((totalCost / totalBudget) * 100) : 0,
        overdueMilestones: overdue,
      };
    }

    case "list_issues": {
      const { projectId, status } = args;
      checkProjectScope(auth, projectId);
      await requireProjectAccess(userId, projectId);
      const where: any = { node: { projectId } };
      if (status) where.status = status;
      const issues = await prisma.issue.findMany({
        where,
        include: { node: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      });
      return issues;
    }

    case "list_vendors": {
      const { projectId } = args;
      checkProjectScope(auth, projectId);
      await requireProjectAccess(userId, projectId);
      return prisma.vendor.findMany({ where: { projectId }, orderBy: { name: "asc" } });
    }

    case "list_categories": {
      const { projectId } = args;
      checkProjectScope(auth, projectId);
      await requireProjectAccess(userId, projectId);
      return prisma.category.findMany({ where: { projectId }, orderBy: { name: "asc" } });
    }

    case "create_node": {
      const { projectId, name, parentId, expectedCost, vendorId, categoryId, status } = args;
      if (!name?.trim()) throw new AuthError("name is required", 400);
      if (!projectId?.trim()) throw new AuthError("projectId is required", 400);
      checkProjectScope(auth, projectId);
      await requireProjectAccess(userId, projectId, ["OWNER", "EDITOR"]);
      if (parentId) {
        const parent = await prisma.projectNode.findUnique({ where: { id: parentId }, select: { projectId: true, expectedCost: true } });
        if (!parent || parent.projectId !== projectId) throw new AuthError("Invalid parentId", 400);
        if (expectedCost && parent.expectedCost) throw new AuthError("Cannot set cost on a sub-task when the parent already has a cost (would double-count)", 400);
      }
      const node = await prisma.projectNode.create({
        data: { name: name.trim(), projectId, parentId: parentId || null, expectedCost, vendorId: vendorId || null, categoryId: categoryId || null, status: status as any || undefined },
        include: { vendor: true, category: true },
      });
      await logAction(projectId, userId, "CREATE", "node", node.id, null, node, apiKeyId);
      return node;
    }

    case "update_node": {
      const { nodeId, ...updates } = args;
      const nodeInfo = await prisma.projectNode.findUnique({ where: { id: nodeId }, select: { projectId: true } });
      if (!nodeInfo) throw new AuthError("Node not found", 404);
      checkProjectScope(auth, nodeInfo.projectId);
      await requireProjectAccess(userId, nodeInfo.projectId, ["OWNER", "EDITOR"]);
      const oldNode = await prisma.projectNode.findUnique({ where: { id: nodeId } });

      // Guard: prevent double-counting
      if (updates.expectedCost !== undefined && updates.expectedCost !== null) {
        const childrenWithCost = await prisma.projectNode.count({ where: { parentId: nodeId, expectedCost: { not: null } } });
        if (childrenWithCost > 0) throw new AuthError("Cannot set cost on a task with costed sub-tasks (would double-count)", 400);
        if (oldNode?.parentId) {
          const parent = await prisma.projectNode.findUnique({ where: { id: oldNode.parentId }, select: { expectedCost: true } });
          if (parent?.expectedCost) throw new AuthError("Cannot set cost on a sub-task when parent already has a cost (would double-count)", 400);
        }
      }

      const data: any = {};
      if (updates.name !== undefined) data.name = updates.name.trim();
      if (updates.status !== undefined) data.status = updates.status;
      if (updates.expectedCost !== undefined) data.expectedCost = updates.expectedCost;
      if (updates.actualCost !== undefined) data.actualCost = updates.actualCost;
      if (updates.vendorId !== undefined) data.vendorId = updates.vendorId || null;
      if (updates.categoryId !== undefined) data.categoryId = updates.categoryId || null;
      if (updates.parentId !== undefined) data.parentId = updates.parentId || null;
      const node = await prisma.projectNode.update({ where: { id: nodeId }, data });
      await logAction(nodeInfo.projectId, userId, "UPDATE", "node", nodeId, oldNode, node, apiKeyId);
      return node;
    }

    case "delete_node": {
      const { nodeId } = args;
      const nodeInfo = await prisma.projectNode.findUnique({ where: { id: nodeId } });
      if (!nodeInfo) throw new AuthError("Node not found", 404);
      checkProjectScope(auth, nodeInfo.projectId);
      await requireProjectAccess(userId, nodeInfo.projectId, ["OWNER", "EDITOR"]);
      await prisma.projectNode.delete({ where: { id: nodeId } });
      await logAction(nodeInfo.projectId, userId, "DELETE", "node", nodeId, nodeInfo, null, apiKeyId);
      return { deleted: true, id: nodeId };
    }

    case "mark_node_done": {
      const { nodeId } = args;
      const node = await prisma.projectNode.findUnique({ where: { id: nodeId }, include: { milestones: true } });
      if (!node) throw new AuthError("Node not found", 404);
      checkProjectScope(auth, node.projectId);
      await requireProjectAccess(userId, node.projectId, ["OWNER", "EDITOR"]);

      const oldNode = { ...node };
      const now = new Date();
      await prisma.projectNode.update({ where: { id: nodeId }, data: { status: "COMPLETED", completedDate: now } });
      const unpaid = node.milestones.filter((m) => m.status !== "PAID");
      for (const m of unpaid) {
        await prisma.paymentMilestone.update({ where: { id: m.id }, data: { status: "PAID", paidDate: now } });
      }
      await logAction(node.projectId, userId, "BATCH", "node", nodeId, oldNode, { status: "COMPLETED", milestonesMarkedPaid: unpaid.length }, apiKeyId);
      return { completed: true, milestonesMarkedPaid: unpaid.length };
    }

    case "create_milestone": {
      const { nodeId, label, amount, percentage, dueDate } = args;
      const node = await prisma.projectNode.findUnique({ where: { id: nodeId }, select: { projectId: true, expectedCost: true } });
      if (!node) throw new AuthError("Node not found", 404);
      checkProjectScope(auth, node.projectId);
      await requireProjectAccess(userId, node.projectId, ["OWNER", "EDITOR"]);

      let finalAmount: number;
      let pct: number | null = null;
      if (percentage && Number(percentage) > 0) {
        pct = Number(percentage);
        if (!node.expectedCost) throw new AuthError("Node has no expected cost — cannot use percentage", 400);
        finalAmount = (pct / 100) * Number(node.expectedCost);
      } else if (amount && Number(amount) > 0) {
        finalAmount = Number(amount);
      } else {
        throw new AuthError("amount or percentage is required", 400);
      }

      const milestone = await prisma.paymentMilestone.create({
        data: { label: label.trim(), amount: finalAmount, percentage: pct, dueDate: dueDate ? new Date(dueDate) : undefined, nodeId },
      });
      await logAction(node.projectId, userId, "CREATE", "milestone", milestone.id, null, milestone, apiKeyId);
      return milestone;
    }

    case "update_milestone": {
      const { nodeId, milestoneId, ...updates } = args;
      const node = await prisma.projectNode.findUnique({ where: { id: nodeId }, select: { projectId: true } });
      if (!node) throw new AuthError("Node not found", 404);
      checkProjectScope(auth, node.projectId);
      await requireProjectAccess(userId, node.projectId, ["OWNER", "EDITOR"]);
      const oldMs = await prisma.paymentMilestone.findUnique({ where: { id: milestoneId } });
      const data: any = {};
      if (updates.label !== undefined) data.label = updates.label.trim();
      if (updates.amount !== undefined) data.amount = Number(updates.amount);
      if (updates.status !== undefined) data.status = updates.status;
      if (updates.paidDate !== undefined) data.paidDate = updates.paidDate ? new Date(updates.paidDate) : null;
      if (updates.dueDate !== undefined) data.dueDate = updates.dueDate ? new Date(updates.dueDate) : null;
      const m = await prisma.paymentMilestone.update({ where: { id: milestoneId }, data });
      await logAction(node.projectId, userId, "UPDATE", "milestone", milestoneId, oldMs, m, apiKeyId);
      return m;
    }

    case "create_issue": {
      const { nodeId, title, description } = args;
      const node = await prisma.projectNode.findUnique({ where: { id: nodeId }, select: { projectId: true } });
      if (!node) throw new AuthError("Node not found", 404);
      checkProjectScope(auth, node.projectId);
      await requireProjectAccess(userId, node.projectId, ["OWNER", "EDITOR"]);
      const issue = await prisma.issue.create({ data: { title: title.trim(), description: description || null, nodeId } });
      await logAction(node.projectId, userId, "CREATE", "issue", issue.id, null, issue, apiKeyId);
      return issue;
    }

    case "update_issue": {
      const { issueId, ...updates } = args;
      const issue = await prisma.issue.findUnique({ where: { id: issueId }, include: { node: { select: { projectId: true } } } });
      if (!issue) throw new AuthError("Issue not found", 404);
      checkProjectScope(auth, issue.node.projectId);
      await requireProjectAccess(userId, issue.node.projectId, ["OWNER", "EDITOR"]);
      const oldIssue = issue;
      const data: any = {};
      if (updates.title !== undefined) data.title = updates.title.trim();
      if (updates.description !== undefined) data.description = updates.description;
      if (updates.status !== undefined) data.status = updates.status;
      const updated = await prisma.issue.update({ where: { id: issueId }, data });
      await logAction(issue.node.projectId, userId, "UPDATE", "issue", issueId, oldIssue, updated, apiKeyId);
      return updated;
    }

    case "create_vendor": {
      const { projectId, name, category, phone, email } = args;
      checkProjectScope(auth, projectId);
      await requireProjectAccess(userId, projectId, ["OWNER", "EDITOR"]);
      const vendor = await prisma.vendor.create({ data: { name: name.trim(), category: category || null, phone: phone || null, email: email || null, projectId } });
      await logAction(projectId, userId, "CREATE", "vendor", vendor.id, null, vendor, apiKeyId);
      return vendor;
    }

    case "upload_receipt": {
      const { nodeId, fileName, fileBase64 } = args;
      const node = await prisma.projectNode.findUnique({ where: { id: nodeId }, select: { projectId: true } });
      if (!node) throw new AuthError("Node not found", 404);
      checkProjectScope(auth, node.projectId);
      await requireProjectAccess(userId, node.projectId, ["OWNER", "EDITOR"]);
      const result = await uploadBase64File(fileName, fileBase64, `receipts/${nodeId}`);
      const receipt = await prisma.receipt.create({ data: { fileUrl: result.url, fileName: result.name, fileSize: result.size, nodeId } });
      return receipt;
    }

    default:
      throw new AuthError(`Unknown tool: ${toolName}`, 400);
  }
}
