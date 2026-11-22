import { Prisma } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";
import type { ModelRow } from "@/types/catalog";
import { iso, modelRowSelect, toModelRow } from "./mappers";

export interface Overview {
  counts: { models: number; providers: number; labs: number; listings: number; free: number; openWeights: number; withBenchmarks: number };
  typeDistribution: { type: string; count: number }[];
  capabilityCoverage: { key: string; name: string; pct: number }[];
  releasesPerMonth: { month: string; count: number }[];
  priceBuckets: { label: string; count: number }[];
  labPricing: { lab: string; median: number; models: number }[];
  recent: ModelRow[]; trending: ModelRow[]; popular: ModelRow[]; cheapest: ModelRow[];
  popularProviders: { slug: string; name: string; type: string; models: number }[];
  featuredLabs: { slug: string; name: string; description: string | null; models: number; open: number }[];
  compareShortcuts: { title: string; ids: string[]; names: string[] }[];
  lastIngested: string | null;
}

export async function getOverview(): Promise<Overview> {
  const db = getDb();
  const textWhere = { type: "TEXT" as const, status: { not: "DEPRECATED" as const } };
  const [models, providers, labs, listings, free, open, withBench, types, capsDef, textTotal, run] = await Promise.all([
    db.model.count(), db.provider.count(), db.lab.count(), db.modelProvider.count(),
    db.model.count({ where: { isFree: true } }), db.model.count({ where: { openWeights: true } }),
    db.model.count({ where: { benchmarks: { some: {} } } }),
    db.model.groupBy({ by: ["type"], _count: { _all: true } }),
    db.capability.findMany({ orderBy: { sortOrder: "asc" }, take: 6, select: { key: true, name: true, _count: { select: { models: { where: { support: "YES", model: textWhere } } } } } }),
    db.model.count({ where: textWhere }),
    db.ingestionRun.findFirst({ where: { status: "SUCCEEDED" }, orderBy: { finishedAt: "desc" }, select: { finishedAt: true } }),
  ]);

  const [releases, buckets, labPricing, recent, popular, cheapest, popProviders, labRows] = await Promise.all([
    db.$queryRaw<{ month: string; n: number }[]>(Prisma.sql`
      SELECT to_char(date_trunc('month', "releaseDate"), 'YYYY-MM') AS month, count(*)::int AS n
      FROM "Model" WHERE "releaseDate" IS NOT NULL AND "releaseDate" >= (current_date - interval '14 months') AND "releaseDate" <= current_date
      GROUP BY 1 ORDER BY 1`),
    db.$queryRaw<{ label: string; n: number }[]>(Prisma.sql`
      SELECT CASE WHEN "listInputPricePerMTok" = 0 THEN '0 Free' WHEN "listInputPricePerMTok" < 0.1 THEN '1 < $0.10'
        WHEN "listInputPricePerMTok" < 0.5 THEN '2 $0.10–0.50' WHEN "listInputPricePerMTok" < 1 THEN '3 $0.50–1'
        WHEN "listInputPricePerMTok" < 3 THEN '4 $1–3' WHEN "listInputPricePerMTok" < 10 THEN '5 $3–10' ELSE '6 $10+' END AS label, count(*)::int AS n
      FROM "Model" WHERE type = 'TEXT' AND status <> 'DEPRECATED' AND "listInputPricePerMTok" IS NOT NULL GROUP BY 1 ORDER BY 1`),
    db.$queryRaw<{ lab: string; median: number; n: number }[]>(Prisma.sql`
      SELECT l.name AS lab, (percentile_cont(0.5) WITHIN GROUP (ORDER BY m."listInputPricePerMTok"))::float AS median, count(*)::int AS n
      FROM "Model" m JOIN "Lab" l ON l.id = m."labId"
      WHERE m.type = 'TEXT' AND m.status <> 'DEPRECATED' AND m."listInputPricePerMTok" > 0 GROUP BY l.name HAVING count(*) >= 5 ORDER BY n DESC LIMIT 8`),
    db.model.findMany({ where: { releaseDate: { not: null, lte: new Date() }, status: { not: "DEPRECATED" } }, orderBy: [{ releaseDate: "desc" }, { popularityScore: "desc" }], take: 8, select: modelRowSelect }),
    db.model.findMany({ where: { type: "TEXT", status: { not: "DEPRECATED" } }, orderBy: [{ popularityScore: "desc" }, { name: "asc" }], take: 8, select: modelRowSelect }),
    db.model.findMany({ where: { ...textWhere, listInputPricePerMTok: { gt: 0 }, contextWindow: { gte: 100_000 }, capabilities: { some: { support: "YES", capability: { key: "tool_calling" } } } }, orderBy: [{ listInputPricePerMTok: "asc" }, { listOutputPricePerMTok: "asc" }], take: 6, select: modelRowSelect }),
    db.$queryRaw<{ slug: string; name: string; type: string; n: number }[]>(Prisma.sql`
      SELECT p.slug, p.name, p.type::text AS type, count(DISTINCT mp."modelId")::int AS n FROM "Provider" p JOIN "ModelProvider" mp ON mp."providerId" = p.id GROUP BY 1,2,3 ORDER BY n DESC LIMIT 6`),
    db.lab.findMany({ select: { slug: true, name: true, description: true, models: { where: { status: { not: "DEPRECATED" } }, select: { openWeights: true } } } }),
  ]);

  // "Trending" = most widely available among models released in the last 180 days (no usage telemetry exists).
  const since = new Date(Date.now() - 180 * 86_400_000);
  const trendingRows = await db.model.findMany({ where: { releaseDate: { gte: since, lte: new Date() }, status: { not: "DEPRECATED" } }, orderBy: [{ providerCount: "desc" }, { releaseDate: "desc" }], take: 6, select: modelRowSelect });

  const featured = labRows.map((l) => ({ slug: l.slug, name: l.name, description: l.description, models: l.models.length, open: l.models.filter((m) => m.openWeights).length }))
    .sort((a, b) => b.models - a.models).slice(0, 6);
  // Compare shortcuts: the most widely-available text model from each of the three biggest labs (built from the DB).
  const tops = await Promise.all(featured.slice(0, 5).map((l) => db.model.findFirst({ where: { lab: { slug: l.slug }, type: "TEXT", status: "ACTIVE", benchmarks: { some: {} } }, orderBy: { popularityScore: "desc" }, select: { canonicalId: true, name: true } })));
  const valid = tops.filter((t): t is { canonicalId: string; name: string } => !!t);
  const shortcuts = [
    valid.length >= 3 ? { title: "Flagships head-to-head", ids: valid.slice(0, 3).map((v) => v.canonicalId), names: valid.slice(0, 3).map((v) => v.name) } : null,
    valid.length >= 4 ? { title: "Next three labs", ids: valid.slice(2, 5).map((v) => v.canonicalId), names: valid.slice(2, 5).map((v) => v.name) } : null,
    cheapest.length >= 3 ? { title: "Budget with tool calling", ids: cheapest.slice(0, 3).map((c) => c.canonicalId), names: cheapest.slice(0, 3).map((c) => c.name) } : null,
  ].filter((x): x is NonNullable<typeof x> => !!x);

  return {
    counts: { models, providers, labs, listings, free, openWeights: open, withBenchmarks: withBench },
    typeDistribution: types.map((t) => ({ type: t.type, count: t._count._all })).sort((a, b) => b.count - a.count),
    capabilityCoverage: capsDef.map((c) => ({ key: c.key, name: c.name, pct: textTotal ? Math.round((c._count.models / textTotal) * 100) : 0 })),
    releasesPerMonth: releases.map((r) => ({ month: r.month, count: r.n })),
    priceBuckets: buckets.map((b) => ({ label: b.label.slice(2), count: b.n })),
    labPricing: labPricing.map((l) => ({ lab: l.lab, median: Number(l.median.toFixed(3)), models: l.n })),
    recent: recent.map(toModelRow), trending: trendingRows.map(toModelRow), popular: popular.map(toModelRow), cheapest: cheapest.map(toModelRow),
    popularProviders: popProviders.map((p) => ({ slug: p.slug, name: p.name, type: p.type, models: p.n })),
    featuredLabs: featured, compareShortcuts: shortcuts, lastIngested: iso(run?.finishedAt),
  };
}
