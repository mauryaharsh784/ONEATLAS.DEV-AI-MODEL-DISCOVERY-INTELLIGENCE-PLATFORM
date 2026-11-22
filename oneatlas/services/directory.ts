import { Prisma } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";
import type { LabRow, ModelRow, Paginated, ProviderRow } from "@/types/catalog";
import { iso, modelRowSelect, num, toModelRow } from "./mappers";
import { listModels } from "./models";
import { modelQuerySchema } from "@/lib/validation/query";

export async function listLabs(opts: { q?: string; sort?: string }): Promise<LabRow[]> {
  const db = getDb();
  const labs = await db.lab.findMany({
    where: opts.q ? { OR: [{ name: { contains: opts.q, mode: "insensitive" } }, { description: { contains: opts.q, mode: "insensitive" } }] } : {},
    select: { slug: true, name: true, description: true, websiteUrl: true, headquarters: true, foundedYear: true, models: { where: { status: { not: "DEPRECATED" } }, select: { openWeights: true, releaseDate: true } } },
  });
  const rows: LabRow[] = labs.map((l) => {
    const dates = l.models.map((m) => m.releaseDate).filter((d): d is Date => !!d).sort((a, b) => b.getTime() - a.getTime());
    return { slug: l.slug, name: l.name, description: l.description, websiteUrl: l.websiteUrl, headquarters: l.headquarters, foundedYear: l.foundedYear,
      modelCount: l.models.length, openCount: l.models.filter((m) => m.openWeights).length, closedCount: l.models.filter((m) => !m.openWeights).length, latestRelease: iso(dates[0]) };
  });
  const sort = opts.sort ?? "models";
  rows.sort((a, b) => sort === "name" ? a.name.localeCompare(b.name) : sort === "open" ? b.openCount - a.openCount : sort === "latest" ? (b.latestRelease ?? "").localeCompare(a.latestRelease ?? "") : b.modelCount - a.modelCount);
  return rows;
}

export async function getLab(slug: string, page: number) {
  const db = getDb();
  const lab = await db.lab.findUnique({ where: { slug } });
  if (!lab) return null;
  const [row] = await listLabs({}).then((all) => all.filter((l) => l.slug === slug));
  const [models, provs, recent] = await Promise.all([
    listModels(modelQuerySchema.parse({ lab: slug, page: String(page), pageSize: "24" })),
    getDb().$queryRaw<{ slug: string; name: string; type: string; n: number }[]>(Prisma.sql`
      SELECT p.slug, p.name, p.type::text AS type, count(DISTINCT mp."modelId")::int AS n FROM "ModelProvider" mp JOIN "Model" m ON m.id = mp."modelId" JOIN "Provider" p ON p.id = mp."providerId"
      WHERE m."labId" = ${lab.id} GROUP BY 1,2,3 ORDER BY n DESC LIMIT 12`),
    db.model.findMany({ where: { labId: lab.id, releaseDate: { not: null }, status: { not: "DEPRECATED" } }, orderBy: { releaseDate: "desc" }, take: 5, select: modelRowSelect }),
  ]);
  return { lab: { ...row, docsUrl: lab.docsUrl, source: lab.source, sourceUrl: lab.sourceUrl, isSimulated: lab.isSimulated }, models, providers: provs, recent: recent.map(toModelRow) };
}

export async function listProviders(opts: { q?: string; type?: string; sort?: string }): Promise<ProviderRow[]> {
  const db = getDb();
  const type = opts.type && ["FIRST_PARTY", "CLOUD_PLATFORM", "INFERENCE_HOST", "GATEWAY"].includes(opts.type) ? opts.type : null;
  const rows = await db.$queryRaw<{ slug: string; name: string; type: string; description: string | null; websiteUrl: string | null; docsUrl: string | null; models: number; listings: number; minin: Prisma.Decimal | null }[]>(Prisma.sql`
    SELECT p.slug, p.name, p.type::text AS type, p.description, p."websiteUrl", p."docsUrl",
      count(DISTINCT mp."modelId")::int AS models, count(DISTINCT mp.id)::int AS listings,
      min(pr."inputPerMTok") FILTER (WHERE pr."inputPerMTok" > 0) AS minin
    FROM "Provider" p LEFT JOIN "ModelProvider" mp ON mp."providerId" = p.id
    LEFT JOIN "Pricing" pr ON pr."modelProviderId" = mp.id AND pr.tier = 'STANDARD' AND pr."effectiveTo" IS NULL
    WHERE (${opts.q ?? null}::text IS NULL OR p.name ILIKE '%' || ${opts.q ?? ""} || '%' OR p.slug ILIKE '%' || ${opts.q ?? ""} || '%')
      AND (${type}::text IS NULL OR p.type::text = ${type})
    GROUP BY p.id`);
  const out: ProviderRow[] = rows.map((r) => ({ slug: r.slug, name: r.name, type: r.type, description: r.description, websiteUrl: r.websiteUrl, docsUrl: r.docsUrl, modelCount: r.models, listingCount: r.listings, minInputPrice: num(r.minin) }));
  const sort = opts.sort ?? "models";
  out.sort((a, b) => sort === "name" ? a.name.localeCompare(b.name) : sort === "price" ? (a.minInputPrice ?? Infinity) - (b.minInputPrice ?? Infinity) : b.modelCount - a.modelCount || a.name.localeCompare(b.name));
  return out;
}

export async function getProvider(slug: string, opts: { q?: string; page: number; pageSize: number }) {
  const db = getDb();
  const p = await db.provider.findUnique({ where: { slug } });
  if (!p) return null;
  const summary = (await listProviders({})).find((x) => x.slug === slug)!;
  const where: Prisma.ModelProviderWhereInput = { providerId: p.id, ...(opts.q ? { OR: [{ providerModelId: { contains: opts.q, mode: "insensitive" } }, { model: { name: { contains: opts.q, mode: "insensitive" } } }] } : {}) };
  const [total, rows, labs] = await Promise.all([
    db.modelProvider.count({ where }),
    db.modelProvider.findMany({ where, orderBy: [{ model: { popularityScore: "desc" } }, { providerModelId: "asc" }], skip: (opts.page - 1) * opts.pageSize, take: opts.pageSize,
      select: { id: true, providerModelId: true, region: true, contextWindow: true, maxOutputTokens: true,
        model: { select: { canonicalId: true, name: true, type: true, lab: { select: { slug: true, name: true } } } },
        pricing: { where: { tier: "STANDARD", effectiveTo: null }, select: { inputPerMTok: true, outputPerMTok: true, cacheReadPerMTok: true, isFree: true }, take: 1 } } }),
    db.$queryRaw<{ slug: string; name: string; n: number }[]>(Prisma.sql`
      SELECT l.slug, l.name, count(DISTINCT mp."modelId")::int AS n FROM "ModelProvider" mp JOIN "Model" m ON m.id = mp."modelId" JOIN "Lab" l ON l.id = m."labId"
      WHERE mp."providerId" = ${p.id} GROUP BY 1,2 ORDER BY n DESC LIMIT 12`),
  ]);
  const listings = rows.map((r) => ({ id: r.id, providerModelId: r.providerModelId, region: r.region, contextWindow: r.contextWindow, maxOutputTokens: r.maxOutputTokens, model: r.model,
    input: num(r.pricing[0]?.inputPerMTok), output: num(r.pricing[0]?.outputPerMTok), cacheRead: num(r.pricing[0]?.cacheReadPerMTok), isFree: r.pricing[0]?.isFree ?? false }));
  return { provider: { ...summary, regions: p.regions, statusPageUrl: p.statusPageUrl, apiBaseUrl: p.apiBaseUrl, source: p.source }, listings, total, page: opts.page, pageSize: opts.pageSize, pageCount: Math.max(1, Math.ceil(total / opts.pageSize)), labs };
}

export async function search(q: string, limit = 6) {
  const db = getDb();
  const c = { contains: q, mode: "insensitive" as const };
  const [models, labs, providers] = await Promise.all([
    db.model.findMany({ where: { status: { not: "DEPRECATED" }, OR: [{ name: c }, { canonicalId: c }, { listings: { some: { providerModelId: c } } }] }, orderBy: { popularityScore: "desc" }, take: limit, select: modelRowSelect }),
    db.lab.findMany({ where: { name: c }, take: 4, select: { slug: true, name: true } }),
    db.provider.findMany({ where: { name: c }, take: 4, select: { slug: true, name: true } }),
  ]);
  return { models: models.map(toModelRow) as ModelRow[], labs, providers };
}
export type { Paginated };
