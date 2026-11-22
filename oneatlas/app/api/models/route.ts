import { publicGet } from "@/lib/api/public";
import { parseModelQuery } from "@/lib/validation/query";
import { listModels } from "@/services/models";

export const dynamic = "force-dynamic";

/** GET /api/models?q=&lab=&provider=&type=&cap=&open=1&free=1&multimodal=1&minContext=&maxInput=&maxOutput=&sort=&dir=&page=&pageSize= */
export const GET = publicGet("models", 120, async (req) => {
  const q = parseModelQuery(req.nextUrl.searchParams);
  const { items, ...page } = await listModels(q);
  return { data: items, meta: page };
});
