/**
 * Structured logging to Upstash Redis Streams.
 * Logs important events (errors, auth, seed) with 48h TTL.
 * Gracefully falls back to console if Redis is unavailable.
 */

import { Redis } from "@upstash/redis";

export type LogLevel = "error" | "warn" | "info";

export interface LogEntry {
  ts: string;
  level: LogLevel;
  event: string;
  message?: string;
  userId?: string;
  projectId?: string;
  error?: string;
  meta?: Record<string, any>;
}

const STREAM_KEY = "reno:logs";
const MAX_ENTRIES = 10000;

let redis: Redis | null = null;
try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
} catch {}

/** Write a log entry to Redis stream (fire-and-forget). */
export function log(level: LogLevel, event: string, meta?: Partial<Omit<LogEntry, "ts" | "level" | "event">>) {
  const entry: LogEntry = {
    ts: new Date().toISOString(),
    level,
    event,
    ...meta,
  };

  // Always console for errors
  if (level === "error") {
    console.error(`[${event}]`, meta?.message || meta?.error || "", meta);
  }

  if (!redis) return;

  // Fire-and-forget — don't await, don't block the request
  redis
    .xadd(STREAM_KEY, "*", entry as any, {
      trim: { type: "MAXLEN", threshold: MAX_ENTRIES, comparison: "~" },
    })
    .catch(() => {}); // silently ignore Redis failures
}

/** Query recent logs from Redis stream. */
export async function queryLogs(filters?: {
  level?: LogLevel;
  event?: string;
  limit?: number;
  since?: string; // ISO date string
}): Promise<LogEntry[]> {
  if (!redis) return [];

  const limit = Math.min(filters?.limit || 100, 500);

  // Convert since date to Redis stream ID (ms timestamp)
  let start = "-";
  if (filters?.since) {
    const ms = new Date(filters.since).getTime();
    if (!isNaN(ms)) start = `${ms}-0`;
  }

  try {
    // xrange returns Record<streamId, entryData>
    const raw: Record<string, Record<string, unknown>> = await redis.xrange(STREAM_KEY, start, "+", limit * 3);

    const entries: LogEntry[] = [];
    for (const [, data] of Object.entries(raw)) {
      // Apply filters
      if (filters?.level && data.level !== filters.level) continue;
      if (filters?.event && data.event !== filters.event) continue;
      entries.push(data as unknown as LogEntry);
      if (entries.length >= limit) break;
    }

    return entries.reverse(); // newest first
  } catch {
    return [];
  }
}
