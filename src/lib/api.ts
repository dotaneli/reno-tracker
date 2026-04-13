import { NextResponse } from "next/server";
import { Prisma } from "../generated/prisma/client";
import { AuthError } from "./dal";
import { log } from "./logger";

export function json<T>(data: T, status = 200) { return NextResponse.json(data, { status }); }
export function errorResponse(message: string, status: number) { return NextResponse.json({ error: message }, { status }); }

export function handleError(err: unknown) {
  if (err instanceof AuthError) return errorResponse(err.message, err.status);
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2025") return errorResponse("Record not found", 404);
    if (err.code === "P2003") return errorResponse("Foreign key constraint failed", 400);
    if (err.code === "P2002") return errorResponse("Unique constraint violation", 409);
  }
  if (err instanceof SyntaxError) return errorResponse("Invalid JSON body", 400);
  log("error", "unhandled_error", { error: err instanceof Error ? err.message : String(err), meta: { stack: err instanceof Error ? err.stack : undefined } });
  return errorResponse("Internal server error", 500);
}

export async function parseBody<T>(request: Request): Promise<T> { return await request.json() as T; }

/** Parse an ISO 8601 date string. Throws AuthError(400) if invalid. Returns null for null/undefined/empty. */
export function parseIsoDate(v: unknown, field: string): Date | null {
  if (v == null || v === "") return null;
  const d = new Date(String(v));
  if (isNaN(d.getTime())) throw new AuthError(`${field} must be a valid ISO 8601 date string`, 400);
  return d;
}

// ── Node types ──
export interface NodeCreateBody {
  name: string;
  projectId: string;
  parentId?: string;
  nodeType?: string;
  categoryId?: string;
  vendorId?: string;
  expectedCost?: number;
  actualCost?: number;
  status?: string;
  startDate?: string;
  endDate?: string;
  expectedDate?: string;
  roomIds?: string[];
}

export interface NodeUpdateBody {
  name?: string;
  parentId?: string | null;
  nodeType?: string | null;
  categoryId?: string | null;
  vendorId?: string | null;
  expectedCost?: number | null;
  actualCost?: number | null;
  status?: string;
  startDate?: string | null;
  endDate?: string | null;
  expectedDate?: string | null;
  completedDate?: string | null;
  roomIds?: string[];
  sortOrder?: number;
}

// ── Issue types ──
export interface IssueCreateBody { title: string; nodeId: string; description?: string; status?: string; }
export interface IssueUpdateBody { title?: string; description?: string | null; status?: string; nodeId?: string; }

// ── Vendor types ──
export interface VendorCreateBody { name: string; projectId: string; category?: string; phone?: string; email?: string; }
export interface VendorUpdateBody { name?: string; category?: string | null; phone?: string | null; email?: string | null; }

// ── Floor/Room types ──
export interface FloorCreateBody { name: string; projectId: string; sortOrder?: number; }
export interface RoomCreateBody { name: string; floorId: string; type?: string; }
export interface RoomUpdateBody { name?: string; type?: string; }

// ── Milestone types ──
export interface MilestoneCreateBody { label: string; amount: number; dueDate?: string; status?: string; }
export interface MilestoneUpdateBody { label?: string; amount?: number; dueDate?: string | null; paidDate?: string | null; status?: string; }

// ── Note types ──
export interface NoteCreateBody { text: string; }
