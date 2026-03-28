/**
 * Action Log — records every mutation for undo/redo.
 *
 * Usage: wrap any mutation with `logAction()` to record before/after state.
 * Undo: reverses the last non-undone action.
 * Redo: re-applies the last undone action.
 */

import { prisma } from "./prisma";

type EntityType = "node" | "milestone" | "issue" | "vendor" | "category" | "room" | "floor" | "receipt" | "note";
type ActionType = "CREATE" | "UPDATE" | "DELETE" | "BATCH";

export async function logAction(
  projectId: string,
  userId: string,
  action: ActionType,
  entity: EntityType,
  entityId: string,
  oldData: any,
  newData: any,
  apiKeyId?: string | null
) {
  await prisma.actionLog.create({
    data: { action, entity, entityId, oldData, newData, projectId, userId, apiKeyId: apiKeyId || null },
  });
}

export async function undoLast(projectId: string, userId: string): Promise<{ success: boolean; description?: string }> {
  // Find the last non-undone action for this project
  const last = await prisma.actionLog.findFirst({
    where: { projectId, undone: false },
    orderBy: { createdAt: "desc" },
  });

  if (!last) return { success: false, description: "Nothing to undo" };

  try {
    await reverseAction(last);
    await prisma.actionLog.update({ where: { id: last.id }, data: { undone: true } });
    return { success: true, description: `Undo: ${last.action} ${last.entity}` };
  } catch (err: any) {
    return { success: false, description: err.message };
  }
}

export async function redoLast(projectId: string, userId: string): Promise<{ success: boolean; description?: string }> {
  // Find the last undone action
  const last = await prisma.actionLog.findFirst({
    where: { projectId, undone: true },
    orderBy: { createdAt: "desc" },
  });

  if (!last) return { success: false, description: "Nothing to redo" };

  try {
    await reapplyAction(last);
    await prisma.actionLog.update({ where: { id: last.id }, data: { undone: false } });
    return { success: true, description: `Redo: ${last.action} ${last.entity}` };
  } catch (err: any) {
    return { success: false, description: err.message };
  }
}

async function reverseAction(log: any) {
  const model = getModel(log.entity);
  if (!model) return;

  switch (log.action) {
    case "CREATE":
      // Undo create = delete
      await (model as any).delete({ where: { id: log.entityId } }).catch(() => {});
      break;
    case "UPDATE":
      // Undo update = restore old data
      if (log.oldData) {
        const { id, createdAt, updatedAt, ...data } = log.oldData as any;
        await (model as any).update({ where: { id: log.entityId }, data }).catch(() => {});
      }
      break;
    case "DELETE":
      // Undo delete = recreate from old data
      if (log.oldData) {
        await (model as any).create({ data: log.oldData }).catch(() => {});
      }
      break;
    case "BATCH":
      // Batch = array of sub-actions stored in oldData
      if (Array.isArray(log.oldData)) {
        for (const sub of [...log.oldData].reverse()) {
          await reverseAction(sub);
        }
      }
      break;
  }
}

async function reapplyAction(log: any) {
  const model = getModel(log.entity);
  if (!model) return;

  switch (log.action) {
    case "CREATE":
      if (log.newData) {
        await (model as any).create({ data: log.newData }).catch(() => {});
      }
      break;
    case "UPDATE":
      if (log.newData) {
        const { id, createdAt, updatedAt, ...data } = log.newData as any;
        await (model as any).update({ where: { id: log.entityId }, data }).catch(() => {});
      }
      break;
    case "DELETE":
      await (model as any).delete({ where: { id: log.entityId } }).catch(() => {});
      break;
    case "BATCH":
      if (Array.isArray(log.newData)) {
        for (const sub of log.newData) {
          await reapplyAction(sub);
        }
      }
      break;
  }
}

function getModel(entity: string) {
  const models: Record<string, any> = {
    node: prisma.projectNode,
    milestone: prisma.paymentMilestone,
    issue: prisma.issue,
    vendor: prisma.vendor,
    category: prisma.category,
    room: prisma.room,
    floor: prisma.floor,
    receipt: prisma.receipt,
    note: prisma.note,
  };
  return models[entity] || null;
}
