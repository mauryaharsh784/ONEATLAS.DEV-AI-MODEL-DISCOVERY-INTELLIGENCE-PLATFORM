import { publicGet } from "@/lib/api/public";
import { ApiError } from "@/lib/api/response";
import { parseListQuery } from "@/lib/validation/query";
import { getProvider } from "@/services/directory";

export const dynamic = "force-dynamic";
export const GET = publicGet<{ params: Promise<{ slug: string }> }>("provider-detail", 120, async (req, { params }) => {
  const q = parseListQuery(req.nextUrl.searchParams);
  const r = await getProvider((await params).slug, { q: q.q, page: q.page, pageSize: q.pageSize });
  if (!r) throw ApiError.notFound("Provider not found");
  return { data: r.provider, meta: { listings: r.listings, total: r.total, page: r.page, pageSize: r.pageSize, pageCount: r.pageCount, labs: r.labs } };
});
