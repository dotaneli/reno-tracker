import { NextResponse } from "next/server";
import { Prisma } from "../generated/prisma/client";

// ---------- Shared API helpers ----------

export function json<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export function handlePrismaError(err: unknown) {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2025") return errorResponse("Record not found", 404);
    if (err.code === "P2003") return errorResponse("Foreign key constraint failed", 400);
    if (err.code === "P2002") return errorResponse("Unique constraint violation", 409);
  }
  console.error("Unhandled error:", err);
  return errorResponse("Internal server error", 500);
}

export async function parseBody<T>(request: Request): Promise<T> {
  const body = await request.json();
  return body as T;
}

// ---------- Phase types ----------

export interface PhaseCreateBody {
  name: string;
  projectId: string;
  status?: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "ON_HOLD";
  startDate?: string;
  endDate?: string;
}

export interface PhaseUpdateBody {
  name?: string;
  status?: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "ON_HOLD";
  startDate?: string | null;
  endDate?: string | null;
}

// ---------- Vendor types ----------

export interface VendorCreateBody {
  name: string;
  category?: string;
  phone?: string;
  email?: string;
}

export interface VendorUpdateBody {
  name?: string;
  category?: string | null;
  phone?: string | null;
  email?: string | null;
}

// ---------- Item types ----------

export interface ItemCreateBody {
  name: string;
  phaseId: string;
  vendorId?: string;
  expectedCost?: number;
  actualCost?: number;
  status?: "PENDING" | "ORDERED" | "DELIVERED" | "INSTALLED" | "CANCELLED";
}

export interface ItemUpdateBody {
  name?: string;
  phaseId?: string;
  vendorId?: string | null;
  expectedCost?: number | null;
  actualCost?: number | null;
  status?: "PENDING" | "ORDERED" | "DELIVERED" | "INSTALLED" | "CANCELLED";
}

// ---------- Issue types ----------

export interface IssueCreateBody {
  title: string;
  phaseId: string;
  description?: string;
  status?: "OPEN" | "IN_PROGRESS" | "RESOLVED";
}

export interface IssueUpdateBody {
  title?: string;
  description?: string | null;
  status?: "OPEN" | "IN_PROGRESS" | "RESOLVED";
  phaseId?: string;
}
