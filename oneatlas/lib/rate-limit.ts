import { ApiError } from "@/lib/api/response";

/**
 * Fixed-window in-memory rate limiter keyed by client IP + bucket name.
 * Good enough for a single instance / dev; on Vercel each lambda has its own memory, so swap the
 * store for Redis/Upstash before relying on it as a hard limit (documented in README).
 */
const buckets = new Map<string, { count: number; reset: number }>();

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd?.split(",")[0] ?? req.headers.get("x-real-ip") ?? "local").trim();
}

export function rateLimit(req: Request, bucket: string, limit: number, windowMs = 60_000): void {
  const now = Date.now();
  const key = `${bucket}:${clientIp(req)}`;
  const cur = buckets.get(key);
  if (!cur || cur.reset <= now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    if (buckets.size > 5000) for (const [k, v] of buckets) if (v.reset <= now) buckets.delete(k);
    return;
  }
  cur.count++;
  if (cur.count > limit) throw new ApiError(429, "RATE_LIMITED", "Too many requests. Please slow down.", { retryAfterSeconds: Math.ceil((cur.reset - now) / 1000) });
}
