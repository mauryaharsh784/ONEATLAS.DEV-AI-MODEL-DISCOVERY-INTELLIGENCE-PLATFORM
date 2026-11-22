import { publicGet } from "@/lib/api/public";
import { ApiError } from "@/lib/api/response";
import { parseListQuery } from "@/lib/validation/query";
import { getLab } from "@/services/directory";

export const dynamic = "force-dynamic";
export const GET = publicGet<{ params: Promise<{ slug: string }> }>("lab-detail", 120, async (req, { params }) => {
  const q = parseListQuery(req.nextUrl.searchParams);
  const r = await getLab((await params).slug, q.page);
  if (!r) throw ApiError.notFound("Lab not found");
  const { models, ...rest } = r;
  return { data: { ...rest, models: models.items }, meta: { total: models.total, page: models.page, pageSize: models.pageSize, pageCount: models.pageCount } };
});
