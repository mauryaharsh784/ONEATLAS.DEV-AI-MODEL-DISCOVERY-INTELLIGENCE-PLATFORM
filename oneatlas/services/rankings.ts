import { getDb } from "@/lib/db";
import type { RankingRow } from "@/types/catalog";
import { modelRowSelect, toModelRow } from "./mappers";

const CATEGORY_BENCH: Record<string, string> = {
  intelligence: "intelligence-index", coding: "coding-index", reasoning: "reasoning-index",
  vision: "vision-index", agentic: "agentic-index", performance: "throughput",
};
/** "Overall" = mean of these five text-capability benchmarks (every scored model has all five). */
export const OVERALL_COMPONENTS = ["intelligence-index", "coding-index", "reasoning-index", "knowledge-index", "math-index"];
const BREAKDOWN = ["intelligence-index", "coding-index", "reasoning-index", "agentic-index", "vision-index", "throughput"];

export async function getRanking(category: string, limit: number): Promise<{ rows: RankingRow[]; label: string; unit: string | null; total: number; basis: string }> {
  const db = getDb();
  let ordered: { modelId: string; score: number }[];
  let unit: string | null = "pts";
  let total: number;
  let basis: string;
  if (category === "overall") {
    const grouped = await db.modelBenchmark.groupBy({ by: ["modelId"], where: { benchmark: { slug: { in: OVERALL_COMPONENTS } } }, _avg: { score: true }, _count: { _all: true }, orderBy: { _avg: { score: "desc" } }, take: limit });
    ordered = grouped.map((g) => ({ modelId: g.modelId, score: Number((g._avg.score?.toNumber() ?? 0).toFixed(1)) }));
    total = (await db.modelBenchmark.groupBy({ by: ["modelId"], where: { benchmark: { slug: { in: OVERALL_COMPONENTS } } } })).length;
    basis = "Mean of Intelligence, Coding, Reasoning, Knowledge and Math indices.";
  } else {
    const slug = CATEGORY_BENCH[category] ?? CATEGORY_BENCH.intelligence;
    const rows = await db.modelBenchmark.findMany({ where: { benchmark: { slug } }, orderBy: { score: "desc" }, take: limit, select: { modelId: true, score: true, benchmark: { select: { unit: true, name: true } } } });
    ordered = rows.map((r) => ({ modelId: r.modelId, score: r.score.toNumber() }));
    unit = rows[0]?.benchmark.unit ?? null;
    total = await db.modelBenchmark.count({ where: { benchmark: { slug } } });
    basis = `Ranked by ${rows[0]?.benchmark.name ?? slug}.`;
  }
  const ids = ordered.map((o) => o.modelId);
  const [models, breakdown] = await Promise.all([
    db.model.findMany({ where: { id: { in: ids } }, select: modelRowSelect }),
    db.modelBenchmark.findMany({ where: { modelId: { in: ids }, benchmark: { slug: { in: BREAKDOWN } } }, select: { modelId: true, score: true, benchmark: { select: { slug: true } } } }),
  ]);
  const byId = new Map(models.map((m) => [m.id, toModelRow(m)]));
  const bd = new Map<string, Record<string, number>>();
  for (const b of breakdown) { const o = bd.get(b.modelId) ?? {}; o[b.benchmark.slug] = b.score.toNumber(); bd.set(b.modelId, o); }
  const rows: RankingRow[] = ordered.flatMap((o, i) => {
    const model = byId.get(o.modelId);
    return model ? [{ rank: i + 1, model, score: o.score, unit, isSimulated: true, breakdown: bd.get(o.modelId) ?? {} }] : [];
  });
  const label = { overall: "Overall", intelligence: "Intelligence", coding: "Coding", reasoning: "Reasoning", vision: "Vision", agentic: "Agentic", performance: "Performance" }[category] ?? "Overall";
  return { rows, label, unit, total, basis };
}
