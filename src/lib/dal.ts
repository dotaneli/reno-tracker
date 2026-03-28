import { auth } from "./auth";
import { prisma } from "./prisma";
import { headers } from "next/headers";
import { createHash } from "crypto";
import type { ProjectRole, ApiKeyScope } from "../generated/prisma/client";

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}

// ── Dual auth: session cookie OR Bearer API key ──

export type AuthResult =
  | { type: "session"; userId: string; email: string }
  | { type: "apiKey"; userId: string; email: string; keyId: string; scope: ApiKeyScope; projectId: string | null };

export async function resolveAuth(): Promise<AuthResult> {
  // 1. Try session auth (existing pattern)
  const session = await auth();
  if (session?.user?.id) {
    return { type: "session", userId: session.user.id, email: session.user.email! };
  }

  // 2. Try Bearer API key
  const hdrs = await headers();
  const authHeader = hdrs.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const hash = createHash("sha256").update(token).digest("hex");
    const key = await prisma.apiKey.findUnique({
      where: { keyHash: hash },
      include: { user: { select: { id: true, email: true } } },
    });
    if (!key) throw new AuthError("Invalid API key", 401);
    if (key.expiresAt && key.expiresAt < new Date()) throw new AuthError("API key expired", 401);

    // Update lastUsedAt at most once per minute (fire-and-forget)
    if (!key.lastUsedAt || Date.now() - key.lastUsedAt.getTime() > 60_000) {
      prisma.apiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } }).catch(() => {});
    }

    return {
      type: "apiKey",
      userId: key.user.id,
      email: key.user.email,
      keyId: key.id,
      scope: key.scope as ApiKeyScope,
      projectId: key.projectId,
    };
  }

  throw new AuthError("Unauthorized", 401);
}

export async function requireUser(): Promise<{ userId: string; email: string }> {
  const result = await resolveAuth();
  return { userId: result.userId, email: result.email };
}

export async function requireProjectAccess(userId: string, projectId: string, requiredRoles?: ProjectRole[]) {
  const m = await prisma.projectMember.findUnique({ where: { projectId_userId: { projectId, userId } } });
  if (!m) throw new AuthError("Project not found", 404);
  if (requiredRoles) {
    // ADMIN has the same permissions as OWNER
    const effectiveRole = m.role === "ADMIN" ? "OWNER" : m.role;
    const expandedRoles = requiredRoles.includes("OWNER" as ProjectRole)
      ? [...requiredRoles, "ADMIN" as ProjectRole]
      : requiredRoles;
    if (!expandedRoles.includes(m.role)) throw new AuthError("Forbidden", 403);
  }
  return m;
}

/** Every ProjectNode has a direct projectId — single hop. */
export async function requireNodeAccess(userId: string, nodeId: string, requiredRoles?: ProjectRole[]) {
  const node = await prisma.projectNode.findUnique({ where: { id: nodeId }, select: { projectId: true } });
  if (!node) throw new AuthError("Node not found", 404);
  await requireProjectAccess(userId, node.projectId, requiredRoles);
  return node;
}

export async function requireIssueAccess(userId: string, issueId: string, requiredRoles?: ProjectRole[]) {
  const issue = await prisma.issue.findUnique({ where: { id: issueId }, select: { node: { select: { projectId: true } } } });
  if (!issue) throw new AuthError("Issue not found", 404);
  await requireProjectAccess(userId, issue.node.projectId, requiredRoles);
  return issue;
}

export async function requireFloorAccess(userId: string, floorId: string, requiredRoles?: ProjectRole[]) {
  const floor = await prisma.floor.findUnique({ where: { id: floorId }, select: { projectId: true } });
  if (!floor) throw new AuthError("Floor not found", 404);
  await requireProjectAccess(userId, floor.projectId, requiredRoles);
  return floor;
}

export async function requireRoomAccess(userId: string, roomId: string, requiredRoles?: ProjectRole[]) {
  const room = await prisma.room.findUnique({ where: { id: roomId }, select: { floor: { select: { projectId: true } } } });
  if (!room) throw new AuthError("Room not found", 404);
  await requireProjectAccess(userId, room.floor.projectId, requiredRoles);
  return room;
}

export async function getUserProjectIds(userId: string): Promise<string[]> {
  const memberships = await prisma.projectMember.findMany({ where: { userId }, select: { projectId: true } });
  return memberships.map((m) => m.projectId);
}
