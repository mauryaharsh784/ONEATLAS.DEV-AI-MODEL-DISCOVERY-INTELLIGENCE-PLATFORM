/**
 * Seeds PostgreSQL from the bundled registry snapshot (prisma/seed/data/litellm-snapshot.json).
 * Resets catalog tables first (and, via CASCADE, anything that references them).
 *   npm run db:seed            use the committed snapshot (deterministic, offline)
 *   npm run data:snapshot      refresh the snapshot from the live registry
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { getDb } from "@/lib/db";
import { BENCHMARKS, simulateScore } from "@/services/ingest/benchmarks";
import { CAPABILITY_DEFS, buildCatalog } from "@/services/ingest/litellm";
import { OBSERVED_AT } from "@/services/ingest/observed-releases";
import { LABS } from "@/services/ingest/reference";
import { recomputeSummaries } from "@/services/ingest/summary";

const chunk = <T,>(a: T[], n: number) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));

async function main() {
  const t0 = Date.now();
  const db = getDb();
  const snap = JSON.parse(fs.readFileSync(path.resolve(__dirname, "data/litellm-snapshot.json"), "utf8"));
  const catalog = buildCatalog(snap.entries);
  const { models } = catalog;
  console.log(`catalog: ${models.length} models, ${catalog.providers.size} providers, ${catalog.stats.listings} listings`);
  if (catalog.stats.unmatchedObserved.length) console.log("observed release dates with no matching model (skipped):", catalog.stats.unmatchedObserved.join(", "));

  await db.$executeRawUnsafe(`TRUNCATE "ModelBenchmark","Benchmark","ModelCapability","Capability","ModelRelease","Pricing","ModelProvider","Model","Provider","Lab","IngestionRun" CASCADE`);
  const run = await db.ingestionRun.create({ data: { source: "LITELLM", fileName: "litellm-snapshot.json", meta: snap.meta } });
  const REGISTRY = snap.meta.sourceUrl as string;

  // Labs & providers
  const labSlugs = [...new Set(models.map((m) => m.labSlug))];
  await db.lab.createMany({ data: labSlugs.map((s) => { const l = LABS[s]; return {
    slug: l.slug, name: l.name, description: l.description, websiteUrl: l.websiteUrl, docsUrl: l.docsUrl ?? null,
    headquarters: l.headquarters ?? null, foundedYear: l.foundedYear ?? null, source: "MANUAL" as const, sourceUrl: l.websiteUrl }; }) });
  await db.provider.createMany({ data: [...catalog.providers.values()].map((p) => ({
    slug: p.slug, name: p.name, type: p.type, description: p.description ?? null, websiteUrl: p.websiteUrl ?? null,
    docsUrl: p.docsUrl ?? null, regions: [], source: p.websiteUrl ? ("MANUAL" as const) : ("LITELLM" as const), sourceUrl: p.websiteUrl ?? REGISTRY })) });
  await db.capability.createMany({ data: CAPABILITY_DEFS.map((c, i) => ({ key: c.key, name: c.name, description: c.description, sortOrder: i })) });
  const labId = new Map((await db.lab.findMany({ select: { id: true, slug: true } })).map((l) => [l.slug, l.id]));
  const providerId = new Map((await db.provider.findMany({ select: { id: true, slug: true } })).map((p) => [p.slug, p.id]));
  const capId = new Map((await db.capability.findMany({ select: { id: true, key: true } })).map((c) => [c.key, c.id]));

  // Models
  for (const part of chunk(models, 300)) {
    await db.model.createMany({ data: part.map((m) => ({
      canonicalId: m.canonicalId, slug: m.slug, name: m.name, description: m.description, family: m.family, type: m.type,
      status: m.status, labId: labId.get(m.labSlug)!, releaseDate: m.releaseDate ? new Date(m.releaseDate) : null,
      contextWindow: m.contextWindow ?? null, maxInputTokens: m.maxInputTokens ?? null, maxOutputTokens: m.maxOutputTokens ?? null,
      inputModalities: m.inputModalities, outputModalities: m.outputModalities, openWeights: m.openWeights,
      supportedParameters: m.supportedParameters, docsUrl: LABS[m.labSlug].docsUrl ?? null, websiteUrl: LABS[m.labSlug].websiteUrl,
      source: "LITELLM" as const, sourceUrl: m.sourceUrl, sourceUpdatedAt: new Date(snap.meta.fetchedAt) })) });
  }
  const modelId = new Map((await db.model.findMany({ select: { id: true, canonicalId: true } })).map((m) => [m.canonicalId, m.id]));

  await db.modelCapability.createMany({ data: models.flatMap((m) => m.capabilities.map((c) => ({
    modelId: modelId.get(m.canonicalId)!, capabilityId: capId.get(c.key)!, support: c.support, source: "LITELLM" as const }))) });
  await db.modelRelease.createMany({ data: models.filter((m) => m.releaseDate).map((m) => ({
    modelId: modelId.get(m.canonicalId)!, kind: "INITIAL" as const, title: `${m.name} released`, releasedAt: new Date(m.releaseDate!),
    summary: m.releaseSource === "OBSERVED" ? `Release date taken from a public listing observed ${OBSERVED_AT}.` : "Date parsed from the model's snapshot identifier; may be a snapshot rather than first release.",
    url: m.releaseUrl ?? null, source: m.releaseSource === "OBSERVED" ? ("MANUAL" as const) : ("LITELLM" as const) })) });

  // Listings, then pricing
  const listingRows = models.flatMap((m) => m.listings.map((l) => ({
    modelId: modelId.get(m.canonicalId)!, providerId: providerId.get(l.provider.slug)!, providerModelId: l.providerModelId,
    region: l.region, isFirstParty: l.isFirstParty, contextWindow: l.contextWindow ?? null, maxOutputTokens: l.maxOutputTokens ?? null,
    features: l.features, docsUrl: null, source: "LITELLM" as const, sourceUrl: l.sourceUrl, lastVerifiedAt: null })));
  for (const part of chunk(listingRows, 500)) await db.modelProvider.createMany({ data: part });
  const listingId = new Map((await db.modelProvider.findMany({ select: { id: true, providerId: true, providerModelId: true } })).map((l) => [`${l.providerId}|${l.providerModelId}`, l.id]));
  const pricingRows = models.flatMap((m) => m.listings.flatMap((l) => l.pricing.map((p) => ({
    modelProviderId: listingId.get(`${providerId.get(l.provider.slug)}|${l.providerModelId}`)!, tier: p.tier,
    contextThreshold: p.contextThreshold ?? null, inputPerMTok: p.inputPerMTok ?? null, outputPerMTok: p.outputPerMTok ?? null,
    cacheReadPerMTok: p.cacheReadPerMTok ?? null, cacheWritePerMTok: p.cacheWritePerMTok ?? null, reasoningPerMTok: p.reasoningPerMTok ?? null,
    audioInPerMTok: p.audioInPerMTok ?? null, audioOutPerMTok: p.audioOutPerMTok ?? null, isFree: p.isFree,
    source: "LITELLM" as const, sourceUrl: l.sourceUrl, effectiveFrom: new Date(snap.meta.fetchedAt) }))));
  for (const part of chunk(pricingRows, 500)) await db.pricing.createMany({ data: part });

  // Summary columns must exist before simulated scores use list prices
  await recomputeSummaries(db);

  // Simulated benchmarks
  await db.benchmark.createMany({ data: BENCHMARKS.map((b) => ({
    slug: b.slug, name: b.name, category: b.category, description: b.description, methodology: b.methodology, unit: b.unit,
    scaleMin: b.scaleMin, scaleMax: b.scaleMax, sourceName: "OneAtlas simulated sample", source: "SAMPLE" as const, isSimulated: true })) });
  const benchId = new Map((await db.benchmark.findMany({ select: { id: true, slug: true } })).map((b) => [b.slug, b.id]));
  const scorable = await db.model.findMany({
    where: { type: "TEXT", status: "ACTIVE", OR: [{ listOutputPricePerMTok: { not: null } }, { listInputPricePerMTok: { not: null } }] },
    select: { id: true, canonicalId: true, listInputPricePerMTok: true, listOutputPricePerMTok: true, releaseDate: true,
      capabilities: { where: { support: "YES" }, select: { capability: { select: { key: true } } } } },
  });
  const scoreRows = scorable.flatMap((m) => {
    const caps = new Set(m.capabilities.map((c) => c.capability.key));
    return BENCHMARKS.flatMap((b) => {
      const s = simulateScore(b, { canonicalId: m.canonicalId, inputPrice: m.listInputPricePerMTok?.toNumber() ?? null,
        outputPrice: m.listOutputPricePerMTok?.toNumber() ?? null, releaseYear: m.releaseDate?.getUTCFullYear() ?? null, caps });
      return s === null ? [] : [{ modelId: m.id, benchmarkId: benchId.get(b.slug)!, score: s, notes: "Simulated sample score", source: "SAMPLE" as const, isSimulated: true }];
    });
  });
  for (const part of chunk(scoreRows, 1000)) await db.modelBenchmark.createMany({ data: part });
  await recomputeSummaries(db);

  await db.ingestionRun.update({ where: { id: run.id }, data: { status: "SUCCEEDED", finishedAt: new Date(),
    createdCount: models.length, meta: { ...(snap.meta as object), listings: listingRows.length, pricingRows: pricingRows.length, simulatedScores: scoreRows.length } } });
  console.log(`seeded: labs=${labSlugs.length} providers=${catalog.providers.size} models=${models.length} listings=${listingRows.length} pricing=${pricingRows.length} simulatedScores=${scoreRows.length} in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  await db.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
