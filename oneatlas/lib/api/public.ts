import type { NextRequest } from "next/server";
import { ok, route } from "@/lib/api/response";
import { rateLimit } from "@/lib/rate-limit";

type Result = { data: unknown; meta?: Record<string, unknown> };

/** Public, cacheable, rate-limited GET endpoint with the standard envelope and error mapping. */
export function publicGet<Ctx = unknown>(bucket: string, limitPerMin: number, fn: (req: NextRequest, ctx: Ctx) => Promise<Result>) {
  return route(async (req: NextRequest, ctx: Ctx) => {
    rateLimit(req, bucket, limitPerMin);
    const r = await fn(req, ctx);
    return ok(r.data, { meta: r.meta, headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
  });
}
