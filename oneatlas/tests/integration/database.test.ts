import { afterAll, describe, expect, it } from "vitest";

import { Prisma } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";

const db = getDb();
afterAll(async () => { await db.$disconnect(); });

/** Run `fn` inside a transaction that is always rolled back, so tests never change the seeded data. */
async function rollback<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  const sentinel = new Error("rollback");
  let out!: T;
  await db.$transaction(async (tx) => { out = await fn(tx); throw sentinel; }).catch((e) => { if (e !== sentinel) throw e; });
  return out;
}
const code = (e: unknown) => (e instanceof Prisma.PrismaClientKnownRequestError ? e.code : String(e));

describe("schema constraints (migration SQL ↔ Prisma schema)", () => {
  it("enforces unique canonicalId and (labId, slug)", async () => {
    const m = await db.model.findFirstOrThrow({ select: { canonicalId: true, slug: true, name: true, labId: true } });
    const err = await rollback(async (tx) => tx.model.create({ data: { ...m } }).then(() => "no error", code));
    expect(err).toBe("P2002");
  });
  it("restricts deleting a lab that still has models, and a provider that still has listings", async () => {
    const lab = await db.lab.findFirstOrThrow();
    expect(await rollback((tx) => tx.lab.delete({ where: { id: lab.id } }).then(() => "no error", code))).toBe("P2003");
    const prov = await db.provider.findFirstOrThrow();
    expect(await rollback((tx) => tx.provider.delete({ where: { id: prov.id } }).then(() => "no error", code))).toBe("P2003");
  });
  it("cascades model deletion to listings, pricing, capabilities and scores", async () => {
    const m = await db.model.findFirstOrThrow({ where: { benchmarks: { some: {} }, capabilities: { some: {} } }, select: { id: true } });
    const after = await rollback(async (tx) => {
      await tx.model.delete({ where: { id: m.id } });
      return { listings: await tx.modelProvider.count({ where: { modelId: m.id } }), caps: await tx.modelCapability.count({ where: { modelId: m.id } }), scores: await tx.modelBenchmark.count({ where: { modelId: m.id } }) };
    });
    expect(after).toEqual({ listings: 0, caps: 0, scores: 0 });
  });
  it("enforces unique (provider, providerModelId), (model, benchmark) and favorite primary key", async () => {
    const l = await db.modelProvider.findFirstOrThrow();
    expect(await rollback((tx) => tx.modelProvider.create({ data: { modelId: l.modelId, providerId: l.providerId, providerModelId: l.providerModelId } }).then(() => "no error", code))).toBe("P2002");
    const s = await db.modelBenchmark.findFirstOrThrow();
    expect(await rollback((tx) => tx.modelBenchmark.create({ data: { modelId: s.modelId, benchmarkId: s.benchmarkId, score: 1 } }).then(() => "no error", code))).toBe("P2002");
    const model = await db.model.findFirstOrThrow({ select: { id: true } });
    const dup = await rollback(async (tx) => {
      const u = await tx.user.create({ data: { email: `t-${Date.now()}@example.com` } });
      await tx.favorite.create({ data: { userId: u.id, modelId: model.id } });
      return tx.favorite.create({ data: { userId: u.id, modelId: model.id } }).then(() => "no error", code);
    });
    expect(dup).toBe("P2002");
  });
  it("rejects invalid enum values and keeps money as exact decimals", async () => {
    const msg = await db.$executeRawUnsafe(`UPDATE "Model" SET type = 'NOPE' WHERE false`).then(() => "ok", (e) => String(e));
    expect(msg).toMatch(/invalid input value for enum|NOPE|enum/i);
    const p = await db.pricing.findFirstOrThrow({ where: { inputPerMTok: { not: null } } });
    expect(Prisma.Decimal.isDecimal(p.inputPerMTok)).toBe(true);
  });
  it("seeded data carries provenance and labels every benchmark score as simulated", async () => {
    expect(await db.modelBenchmark.count({ where: { isSimulated: false } })).toBe(0);
    expect(await db.benchmark.count({ where: { isSimulated: false } })).toBe(0);
    expect(await db.model.count({ where: { source: "LITELLM", sourceUrl: null } })).toBe(0);
    expect(await db.pricing.count({ where: { source: "LITELLM", sourceUrl: null } })).toBe(0);
    expect(await db.ingestionRun.count({ where: { status: "SUCCEEDED" } })).toBeGreaterThan(0);
  });
  it("derived summary columns agree with the underlying listings", async () => {
    const bad = await db.$queryRaw<{ n: number }[]>`
      SELECT count(*)::int AS n FROM "Model" m WHERE m."providerCount" <> (SELECT count(DISTINCT "providerId") FROM "ModelProvider" WHERE "modelId" = m.id)`;
    expect(bad[0].n).toBe(0);
    const free = await db.model.findMany({ where: { isFree: true }, select: { listInputPricePerMTok: true, listOutputPricePerMTok: true } });
    expect(free.every((m) => m.listInputPricePerMTok?.toNumber() === 0 && m.listOutputPricePerMTok?.toNumber() === 0)).toBe(true);
  });
});
