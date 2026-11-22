import { publicGet } from "@/lib/api/public";
import { parseListQuery } from "@/lib/validation/query";
import { listLabs } from "@/services/directory";

export const dynamic = "force-dynamic";
export const GET = publicGet("labs", 120, async (req) => {
  const q = parseListQuery(req.nextUrl.searchParams);
  const rows = await listLabs({ q: q.q, sort: q.sort });
  return { data: rows, meta: { total: rows.length } };
});
