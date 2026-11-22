import { getDb } from "@/lib/db";
import type { BenchmarkRow, RankingRow } from "@/types/catalog";
import { modelRowSelect, toModelRow } from "./mappers";

export async function listBenchmarks(): Promise<BenchmarkRow[]> {
  const db = getDb();
  const benches = await db.benchmark.findMany({ orderBy: { createdAt: "asc" }, select: { id: true, slug: true, name: true, category: true, description: true, methodology: true, unit: true, isSimulated: true, _count: { select: { scores: true } } } });
  const tops = await Promise.all(benches.map((b) => db.modelBenchmark.findMany({ where: { benchmarkId: b.id }, orderBy: { score: "desc" }, take: 3, select: { score: true, model: { select: { canonicalId: true, name: true, lab: { select: { name: true } } } } } })));
  return benches.map((b, i) => ({
    slug: b.slug, name: b.name, category: b.category, description: b.description, methodology: b.methodology, unit: b.unit, isSimulated: b.isSimulated, modelCount: b._count.scores,
    top: tops[i].map((t) => ({ canonicalId: t.model.canonicalId, name: t.model.name, lab: t.model.lab.name, score: t.score.toNumber() })),
  }));
}

export async function getBenchmark(slug: string, limit: number) {
  const db = getDb();
  const b = await db.benchmark.findUnique({ where: { slug }, select: { id: true, slug: true, name: true, category: true, description: true, methodology: true, unit: true, isSimulated: true, scaleMin: true, scaleMax: true, higherIsBetter: true } });
  if (!b) return null;
  const [rows, agg] = await Promise.all([
    db.modelBenchmark.findMany({ where: { benchmarkId: b.id }, orderBy: { score: "desc" }, take: limit, select: { score: true, rank: true, isSimulated: true, model: { select: modelRowSelect } } }),
    db.modelBenchmark.aggregate({ where: { benchmarkId: b.id }, _avg: { score: true }, _min: { score: true }, _max: { score: true }, _count: { _all: true } }),
  ]);
  const board: RankingRow[] = rows.map((r, i) => ({ rank: r.rank ?? i + 1, model: toModelRow(r.model), score: r.score.toNumber(), unit: b.unit, isSimulated: r.isSimulated, breakdown: {} }));
  return {
    benchmark: { slug: b.slug, name: b.name, category: b.category, description: b.description, methodology: b.methodology, unit: b.unit, isSimulated: b.isSimulated, scaleMin: b.scaleMin?.toNumber() ?? null, scaleMax: b.scaleMax?.toNumber() ?? null },
    stats: { count: agg._count._all, avg: agg._avg.score?.toNumber() ?? null, min: agg._min.score?.toNumber() ?? null, max: agg._max.score?.toNumber() ?? null },
    board,
  };
}

/** Top models on the main indices, for the cross-benchmark comparison chart. */
export async function getBenchmarkComparison(limit = 8) {
  const db = getDb();
  const slugs = ["intelligence-index", "coding-index", "reasoning-index", "knowledge-index", "math-index"];
  const top = await db.modelBenchmark.groupBy({ by: ["modelId"], where: { benchmark: { slug: { in: slugs } } }, _avg: { score: true }, orderBy: { _avg: { score: "desc" } }, take: limit });
  const ids = top.map((t) => t.modelId);
  const [models, scores] = await Promise.all([
    db.model.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, canonicalId: true } }),
    db.modelBenchmark.findMany({ where: { modelId: { in: ids }, benchmark: { slug: { in: slugs } } }, select: { modelId: true, score: true, benchmark: { select: { slug: true, name: true } } } }),
  ]);
  const name = new Map(models.map((m) => [m.id, m]));
  const benches = [...new Map(scores.map((s) => [s.benchmark.slug, s.benchmark.name])).entries()].map(([slug, label]) => ({ slug, label }));
  const data = ids.flatMap((id) => {
    const m = name.get(id);
    if (!m) return [];
    const row: Record<string, string | number> = { model: m.name };
    for (const s of scores.filter((x) => x.modelId === id)) row[s.benchmark.slug] = s.score.toNumber();
    return [row];
  });
  return { data, benches };
}
