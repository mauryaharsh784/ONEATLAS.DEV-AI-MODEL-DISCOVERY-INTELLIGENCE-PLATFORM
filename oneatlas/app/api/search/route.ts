import { z } from "zod";
import { publicGet } from "@/lib/api/public";
import { search } from "@/services/directory";

export const dynamic = "force-dynamic";
const schema = z.object({ q: z.string().trim().min(1, "q is required").max(80), limit: z.coerce.number().int().min(1).max(20).catch(6) });

/** GET /api/search?q=claude — grouped models / labs / providers for the global search box. */
export const GET = publicGet("search", 60, async (req) => {
  const p = schema.parse({ q: req.nextUrl.searchParams.get("q") ?? "", limit: req.nextUrl.searchParams.get("limit") ?? undefined });
  return { data: await search(p.q, p.limit) };
});
