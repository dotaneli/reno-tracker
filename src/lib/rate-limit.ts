/**
 * In-memory sliding-window rate limiter.
 * Resets on cold start (acceptable for this scale).
 * 120 requests per minute per API key.
 */

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 120;

interface Window {
  count: number;
  resetAt: number;
}

const windows = new Map<string, Window>();

// Clean up stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, w] of windows) {
    if (w.resetAt < now) windows.delete(key);
  }
}, 5 * 60_000);

export function checkRateLimit(keyHash: string): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const w = windows.get(keyHash);

  if (!w || w.resetAt < now) {
    windows.set(keyHash, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, retryAfterMs: 0 };
  }

  if (w.count >= MAX_REQUESTS) {
    return { allowed: false, retryAfterMs: w.resetAt - now };
  }

  w.count++;
  return { allowed: true, retryAfterMs: 0 };
}
