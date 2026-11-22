import { publicGet } from "@/lib/api/public";
import { ApiError } from "@/lib/api/response";
import { getDb } from "@/lib/db";
import { getModelDetail, getRelatedModels } from "@/services/models";

export const dynamic = "force-dynamic";

/** GET /api/models/:id — id is the database id or the URL-encoded canonical id ("openai%2Fgpt-4o"). */
export const GET = publicGet<{ params: Promise<{ id: string }> }>("model-detail", 120, async (_req, { params }) => {
  const id = decodeURIComponent((await params).id);
  let canonical = id;
  if (!id.includes("/")) {
    const row = await getDb().model.findUnique({ where: { id }, select: { canonicalId: true } });
    if (!row) throw ApiError.notFound("Model not found");
    canonical = row.canonicalId;
  }
  const [lab, slug] = canonical.split("/");
  const model = lab && slug ? await getModelDetail(lab, slug) : null;
  if (!model) throw ApiError.notFound("Model not found");
  return { data: { ...model, related: await getRelatedModels(model) } };
});
