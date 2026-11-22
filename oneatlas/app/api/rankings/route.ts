import { publicGet } from "@/lib/api/public";
import { parseRankingQuery } from "@/lib/validation/query";
import { getRanking } from "@/services/rankings";

export const dynamic = "force-dynamic";
/** GET /api/rankings?category=overall|intelligence|coding|reasoning|vision|agentic|performance&limit=10|20|50 — scores are SIMULATED. */
export const GET = publicGet("rankings", 120, async (req) => {
  const q = parseRankingQuery(req.nextUrl.searchParams);
  const { rows, ...meta } = await getRanking(q.category, q.limit);
  return { data: rows, meta: { ...meta, category: q.category, limit: q.limit, simulated: true } };
});
