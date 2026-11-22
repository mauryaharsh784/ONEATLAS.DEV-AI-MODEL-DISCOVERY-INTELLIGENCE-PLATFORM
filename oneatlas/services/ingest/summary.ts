import type { Db } from "@/lib/db";

/**
 * Recomputes the derived summary columns on Model (list prices, providerCount, popularityScore) and
 * benchmark ranks. Call after any ingestion, import or admin edit that touches listings, pricing or scores.
 * Statements are static SQL (no user input).
 */
export async function recomputeSummaries(db: Db): Promise<void> {
  await db.$executeRawUnsafe(`
    UPDATE "Model" SET "listInputPricePerMTok" = NULL, "listOutputPricePerMTok" = NULL, "listCacheReadPricePerMTok" = NULL, "isFree" = false`);
  await db.$executeRawUnsafe(`
    WITH lp AS (
      SELECT DISTINCT ON (mp."modelId") mp."modelId" AS id, p."inputPerMTok" AS i, p."outputPerMTok" AS o, p."cacheReadPerMTok" AS c, p."isFree" AS f
      FROM "ModelProvider" mp
      JOIN "Pricing" p ON p."modelProviderId" = mp.id AND p.tier = 'STANDARD' AND p."effectiveTo" IS NULL
      ORDER BY mp."modelId", mp."isFirstParty" DESC, p."inputPerMTok" ASC NULLS LAST, mp."createdAt"
    )
    UPDATE "Model" m SET "listInputPricePerMTok" = lp.i, "listOutputPricePerMTok" = lp.o,
      "listCacheReadPricePerMTok" = lp.c, "isFree" = COALESCE(lp.f, false)
    FROM lp WHERE lp.id = m.id`);
  await db.$executeRawUnsafe(`
    UPDATE "Model" SET "providerCount" = 0`);
  await db.$executeRawUnsafe(`
    UPDATE "Model" m SET "providerCount" = c.n
    FROM (SELECT "modelId", count(DISTINCT "providerId")::int AS n FROM "ModelProvider" GROUP BY 1) c WHERE c."modelId" = m.id`);
  await db.$executeRawUnsafe(`
    UPDATE "Model" SET "popularityScore" = "providerCount" + "favoriteCount" * 2 + "viewCount" * 0.1`);
  await db.$executeRawUnsafe(`
    UPDATE "ModelBenchmark" mb SET rank = r.rk
    FROM (SELECT id, rank() OVER (PARTITION BY "benchmarkId" ORDER BY score DESC)::int AS rk FROM "ModelBenchmark") r
    WHERE r.id = mb.id`);
}
