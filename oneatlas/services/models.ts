import { Prisma } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";
import type { ModelQuery } from "@/lib/validation/query";
import type { ListingDTO, ModelDetail, ModelRow, Paginated, ScoreDTO } from "@/types/catalog";
import { iso, modelRowSelect, num, toModelRow } from "./mappers";

export function buildModelWhere(q: ModelQuery): Prisma.ModelWhereInput {
  const and: Prisma.ModelWhereInput[] = [];
  if (!q.deprecated) and.push({ status: { not: "DEPRECATED" } });
  if (q.ids.length) and.push({ canonicalId: { in: q.ids } });
  if (q.q) {
    const c = { contains: q.q, mode: "insensitive" as const };
    and.push({ OR: [
      { name: c }, { canonicalId: c }, { lab: { name: c } },
      { listings: { some: { OR: [{ providerModelId: c }, { provider: { name: c } }] } } },
    ] });
  }
  if (q.lab.length) and.push({ lab: { slug: { in: q.lab } } });
  if (q.provider.length) and.push({ listings: { some: { provider: { slug: { in: q.provider } } } } });
  if (q.type.length) and.push({ type: { in: q.type.map((t) => t.toUpperCase()) as never } });
  for (const key of q.cap) and.push({ capabilities: { some: { support: "YES", capability: { key } } } });
  if (q.open) and.push({ openWeights: true });
  if (q.free) and.push({ isFree: true });
  if (q.multimodal) and.push({ inputModalities: { hasSome: ["IMAGE", "AUDIO", "VIDEO", "FILE"] } });
  if (q.minContext) and.push({ contextWindow: { gte: q.minContext } });
  if (q.maxInput !== undefined) and.push({ listInputPricePerMTok: { lte: q.maxInput } });
  if (q.maxOutput !== undefined) and.push({ listOutputPricePerMTok: { lte: q.maxOutput } });
  return and.length ? { AND: and } : {};
}

export function buildModelOrder(q: ModelQuery): Prisma.ModelOrderByWithRelationInput[] {
  const nulls = (dir: "asc" | "desc") => ({ sort: dir, nulls: "last" as const });
  const tie: Prisma.ModelOrderByWithRelationInput = { name: "asc" };
  switch (q.sort) {
    case "released": return [{ releaseDate: nulls(q.dir ?? "desc") }, { popularityScore: "desc" }, tie];
    case "context": return [{ contextWindow: nulls(q.dir ?? "desc") }, tie];
    case "input_price": return [{ listInputPricePerMTok: nulls(q.dir ?? "asc") }, tie];
    case "output_price": return [{ listOutputPricePerMTok: nulls(q.dir ?? "asc") }, tie];
    case "name": return [{ name: q.dir ?? "asc" }];
    default: return [{ popularityScore: q.dir ?? "desc" }, tie];
  }
}

export async function listModels(q: ModelQuery): Promise<Paginated<ModelRow>> {
  const db = getDb();
  const where = buildModelWhere(q);
  const [total, rows] = await Promise.all([
    db.model.count({ where }),
    db.model.findMany({ where, orderBy: buildModelOrder(q), skip: (q.page - 1) * q.pageSize, take: q.pageSize, select: modelRowSelect }),
  ]);
  return { items: rows.map(toModelRow), total, page: q.page, pageSize: q.pageSize, pageCount: Math.max(1, Math.ceil(total / q.pageSize)) };
}

/** Unfiltered counts for the filter sidebar (cached 60 s per process). */
export interface Facets {
  total: number;
  labs: { slug: string; name: string; count: number }[];
  providers: { slug: string; name: string; count: number }[];
  types: { value: string; count: number }[];
  capabilities: { key: string; name: string; count: number }[];
}
let facetCache: { at: number; value: Facets } | null = null;
export async function getFacets(): Promise<Facets> {
  if (facetCache && Date.now() - facetCache.at < 60_000) return facetCache.value;
  const db = getDb();
  const [labs, types, caps, providers, total] = await Promise.all([
    db.lab.findMany({ select: { slug: true, name: true, _count: { select: { models: true } } } }),
    db.model.groupBy({ by: ["type"], _count: { _all: true } }),
    db.capability.findMany({ where: { isFilterable: true }, orderBy: { sortOrder: "asc" }, select: { key: true, name: true, _count: { select: { models: { where: { support: "YES" } } } } } }),
    db.$queryRaw<{ slug: string; name: string; n: number }[]>(Prisma.sql`
      SELECT p.slug, p.name, count(DISTINCT mp."modelId")::int AS n FROM "Provider" p JOIN "ModelProvider" mp ON mp."providerId" = p.id GROUP BY p.slug, p.name ORDER BY n DESC`),
    db.model.count(),
  ]);
  const value: Facets = {
    total,
    labs: labs.map((l) => ({ slug: l.slug, name: l.name, count: l._count.models })).sort((a, b) => b.count - a.count),
    providers: providers.map((p) => ({ slug: p.slug, name: p.name, count: p.n })),
    types: types.map((t) => ({ value: t.type, count: t._count._all })).sort((a, b) => b.count - a.count),
    capabilities: caps.map((c) => ({ key: c.key, name: c.name, count: c._count.models })),
  };
  facetCache = { at: Date.now(), value };
  return value;
}

export async function getModelDetail(labSlug: string, slug: string): Promise<ModelDetail | null> {
  const db = getDb();
  const canonicalId = `${labSlug}/${slug}`;
  const [base, extra] = await Promise.all([
    db.model.findUnique({ where: { canonicalId }, select: modelRowSelect }),
    db.model.findUnique({
      where: { canonicalId },
      select: {
        description: true, maxInputTokens: true, docsUrl: true, websiteUrl: true, supportedParameters: true, knowledgeCutoff: true,
        license: true, source: true, sourceUrl: true, sourceUpdatedAt: true, isSimulated: true,
        capabilities: { select: { support: true, capability: { select: { key: true, name: true, sortOrder: true } } } },
        releases: { orderBy: { releasedAt: "desc" }, take: 1, select: { summary: true, url: true } },
        benchmarks: { select: { score: true, rank: true, isSimulated: true, benchmark: { select: { slug: true, name: true, category: true, unit: true } } } },
        listings: {
          select: { id: true, providerModelId: true, region: true, isFirstParty: true, contextWindow: true, maxOutputTokens: true, sourceUrl: true,
            provider: { select: { slug: true, name: true, type: true } },
            pricing: { where: { effectiveTo: null }, select: { tier: true, contextThreshold: true, inputPerMTok: true, outputPerMTok: true, cacheReadPerMTok: true, cacheWritePerMTok: true, isFree: true } } },
        },
      },
    }),
  ]);
  if (!base || !extra) return null;
  const listings: ListingDTO[] = extra.listings.map((l) => ({
    id: l.id, provider: l.provider, providerModelId: l.providerModelId, region: l.region, isFirstParty: l.isFirstParty,
    contextWindow: l.contextWindow, maxOutputTokens: l.maxOutputTokens, sourceUrl: l.sourceUrl,
    pricing: l.pricing.map((p) => ({ tier: p.tier, contextThreshold: p.contextThreshold, input: num(p.inputPerMTok), output: num(p.outputPerMTok), cacheRead: num(p.cacheReadPerMTok), cacheWrite: num(p.cacheWritePerMTok), isFree: p.isFree })),
  }));
  const std = (l: ListingDTO) => l.pricing.find((p) => p.tier === "STANDARD")?.input ?? Infinity;
  listings.sort((a, b) => Number(b.isFirstParty) - Number(a.isFirstParty) || std(a) - std(b) || a.provider.name.localeCompare(b.provider.name));
  const scores: ScoreDTO[] = extra.benchmarks.map((b) => ({
    slug: b.benchmark.slug, name: b.benchmark.name, category: b.benchmark.category, score: b.score.toNumber(), rank: b.rank, unit: b.benchmark.unit, isSimulated: b.isSimulated,
  }));
  return {
    ...toModelRow(base),
    description: extra.description, maxInputTokens: extra.maxInputTokens, docsUrl: extra.docsUrl, websiteUrl: extra.websiteUrl,
    supportedParameters: extra.supportedParameters, knowledgeCutoff: iso(extra.knowledgeCutoff), license: extra.license,
    source: extra.source, sourceUrl: extra.sourceUrl, sourceUpdatedAt: iso(extra.sourceUpdatedAt), isSimulated: extra.isSimulated,
    allCapabilities: [...extra.capabilities].sort((a, b) => a.capability.sortOrder - b.capability.sortOrder).map((c) => ({ key: c.capability.key, name: c.capability.name, support: c.support })),
    listings, scores, releaseNote: extra.releases[0]?.summary ?? null, releaseUrl: extra.releases[0]?.url ?? null,
  };
}

export async function getRelatedModels(model: ModelRow, limit = 6): Promise<ModelRow[]> {
  const db = getDb();
  const base = { id: { not: model.id }, type: model.type, status: { not: "DEPRECATED" as const } };
  const sameLab = await db.model.findMany({
    where: { ...base, lab: { slug: model.lab.slug }, ...(model.family ? { family: model.family } : {}) },
    orderBy: [{ releaseDate: { sort: "desc", nulls: "last" } }, { popularityScore: "desc" }], take: limit, select: modelRowSelect,
  });
  let rows = sameLab;
  if (rows.length < limit && model.inputPrice !== null) {
    const near = await db.model.findMany({
      where: { ...base, id: { notIn: [model.id, ...rows.map((r) => r.id)] }, listInputPricePerMTok: { not: null } },
      orderBy: { popularityScore: "desc" }, take: 60, select: modelRowSelect,
    });
    near.sort((a, b) => Math.abs((a.listInputPricePerMTok?.toNumber() ?? 0) - model.inputPrice!) - Math.abs((b.listInputPricePerMTok?.toNumber() ?? 0) - model.inputPrice!));
    rows = [...rows, ...near.slice(0, limit - rows.length)];
  }
  return rows.map(toModelRow);
}

/** For the comparison page: preserves the order of the requested IDs and attaches benchmark scores. */
export async function getComparison(ids: string[]) {
  const db = getDb();
  const unique = [...new Set(ids)].slice(0, 5);
  if (!unique.length) return { models: [], scores: {} as Record<string, Record<string, number>>, benchmarks: [] as { slug: string; name: string; unit: string | null }[] };
  const rows = await db.model.findMany({ where: { canonicalId: { in: unique } }, select: modelRowSelect });
  const order = new Map(unique.map((id, i) => [id, i]));
  const models = rows.map(toModelRow).sort((a, b) => order.get(a.canonicalId)! - order.get(b.canonicalId)!);
  const sc = await db.modelBenchmark.findMany({ where: { modelId: { in: models.map((m) => m.id) } }, select: { modelId: true, score: true, benchmark: { select: { slug: true, name: true, unit: true } } } });
  const scores: Record<string, Record<string, number>> = {};
  const bm = new Map<string, { slug: string; name: string; unit: string | null }>();
  for (const s of sc) { (scores[s.modelId] ??= {})[s.benchmark.slug] = s.score.toNumber(); bm.set(s.benchmark.slug, s.benchmark); }
  return { models, scores, benchmarks: [...bm.values()] };
}
