import { publicGet } from "@/lib/api/public";
import { parseListQuery } from "@/lib/validation/query";
import { listProviders } from "@/services/directory";

export const dynamic = "force-dynamic";
export const GET = publicGet("providers", 120, async (req) => {
  const q = parseListQuery(req.nextUrl.searchParams);
  const rows = await listProviders({ q: q.q, type: q.type, sort: q.sort });
  return { data: rows, meta: { total: rows.length } };
});
