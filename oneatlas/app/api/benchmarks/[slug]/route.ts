import { publicGet } from "@/lib/api/public";
import { ApiError } from "@/lib/api/response";
import { parseRankingQuery } from "@/lib/validation/query";
import { getBenchmark } from "@/services/benchmarks";

export const dynamic = "force-dynamic";
export const GET = publicGet<{ params: Promise<{ slug: string }> }>("benchmark-detail", 120, async (req, { params }) => {
  const { limit } = parseRankingQuery({ limit: req.nextUrl.searchParams.get("limit") ?? undefined });
  const r = await getBenchmark((await params).slug, limit);
  if (!r) throw ApiError.notFound("Benchmark not found");
  return { data: r.board, meta: { benchmark: r.benchmark, stats: r.stats } };
});
