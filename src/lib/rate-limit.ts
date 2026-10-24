// Sliding-window limiter keyed by caller (IP).
// ponytail: in-memory, so counts reset per server instance/restart and aren't shared across serverless instances; use Redis/Upstash if that matters.
const hits = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs = 60_000, now = Date.now()) {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return { ok: false, retryAfter: Math.max(1, Math.ceil((recent[0] + windowMs - now) / 1000)) };
  }
  recent.push(now);
  hits.set(key, recent);
  return { ok: true, retryAfter: 0 };
}
