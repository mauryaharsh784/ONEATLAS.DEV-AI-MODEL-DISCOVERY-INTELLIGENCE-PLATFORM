import { NextRequest } from "next/server";
import { afterAll, describe, expect, it } from "vitest";

import { GET as health } from "@/app/api/health/route";
import { GET as models } from "@/app/api/models/route";
import { GET as modelById } from "@/app/api/models/[id]/route";
import { GET as providers } from "@/app/api/providers/route";
import { GET as providerBySlug } from "@/app/api/providers/[slug]/route";
import { GET as labs } from "@/app/api/labs/route";
import { GET as labBySlug } from "@/app/api/labs/[slug]/route";
import { GET as rankings } from "@/app/api/rankings/route";
import { GET as benchmarks } from "@/app/api/benchmarks/route";
import { GET as benchmarkBySlug } from "@/app/api/benchmarks/[slug]/route";
import { GET as search } from "@/app/api/search/route";
import { GET as stats } from "@/app/api/stats/route";
import { getDb } from "@/lib/db";
import { getComparison } from "@/services/models";
import type { ModelRow } from "@/types/catalog";

let n = 0;
const call = async (h: (...a: never[]) => Promise<Response>, path: string, ctx?: unknown) => {
  // distinct client IP per call so the in-memory rate limiter never interferes with assertions
  const req = new NextRequest(`http://localhost${path}`, { headers: { "x-forwarded-for": `10.0.${Math.floor(++n / 250)}.${n % 250}` } });
  const res = await (h as (r: NextRequest, c?: unknown) => Promise<Response>)(req, ctx);
  return { status: res.status, body: await res.json(), headers: res.headers };
};
const params = <T,>(p: T) => ({ params: Promise.resolve(p) });
const rows = (b: { data: ModelRow[] }) => b.data;

afterAll(async () => { await getDb().$disconnect(); });

describe("health", () => {
  it("reports a migrated, seeded database", async () => {
    const { status, body } = await call(health, "/api/health");
    expect(status).toBe(200);
    expect(body.data).toMatchObject({ status: "ok", database: "up", migrated: true });
    expect(body.data.models).toBeGreaterThan(100);
  });
});

describe("GET /api/models — search, filter, sort, pagination", () => {
  it("returns the standard envelope with pagination meta", async () => {
    const { status, body, headers } = await call(models, "/api/models?pageSize=12");
    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data).toHaveLength(12);
    expect(body.meta).toMatchObject({ page: 1, pageSize: 12 });
    expect(body.meta.total).toBeGreaterThan(12);
    expect(body.meta.pageCount).toBe(Math.ceil(body.meta.total / 12));
    expect(headers.get("cache-control")).toContain("s-maxage");
  });
  it("paginates without overlap or gaps", async () => {
    const a = rows((await call(models, "/api/models?pageSize=12&page=1&sort=name&dir=asc")).body);
    const b = rows((await call(models, "/api/models?pageSize=12&page=2&sort=name&dir=asc")).body);
    expect(new Set([...a, ...b].map((m) => m.id)).size).toBe(24);
    expect(a[a.length - 1].name.localeCompare(b[0].name, undefined, { sensitivity: "base" })).toBeLessThanOrEqual(0);
  });
  it("searches by name, model id, lab and provider (case-insensitive)", async () => {
    const byName = (await call(models, "/api/models?q=CLAUDE&pageSize=96")).body;
    expect(byName.meta.total).toBeGreaterThan(0);
    // every hit matches "claude" via its name, model id, lab, or a provider-specific model id (the last is not in the row)
    expect(rows(byName).filter((m) => /claude/i.test(m.name) || /claude/i.test(m.canonicalId)).length).toBeGreaterThan(5);
    expect(rows(byName).some((m) => m.lab.slug === "anthropic")).toBe(true);
    const id = rows(byName)[0].canonicalId;
    expect(rows((await call(models, `/api/models?q=${encodeURIComponent(id)}`)).body).map((m) => m.canonicalId)).toContain(id);
    // searching by lab name returns that lab's models
    const byLab = rows((await call(models, "/api/models?q=anthropic&pageSize=96")).body);
    expect(byLab.length).toBeGreaterThan(0);
    expect(byLab.filter((m) => m.lab.slug === "anthropic").length).toBe(byLab.length);
    expect((await call(models, "/api/models?q=bedrock")).body.meta.total).toBeGreaterThan(0);
    expect((await call(models, "/api/models?q=zzzz-no-such-model")).body.meta.total).toBe(0);
  });
  it("filters by lab, capability, open weights, free and multimodal", async () => {
    const lab = rows((await call(models, "/api/models?lab=anthropic&pageSize=96")).body);
    expect(lab.length).toBeGreaterThan(0);
    expect(lab.every((m) => m.lab.slug === "anthropic")).toBe(true);
    const caps = rows((await call(models, "/api/models?cap=reasoning,tool_calling&pageSize=96")).body);
    expect(caps.length).toBeGreaterThan(0);
    expect(caps.every((m) => m.capabilities.includes("reasoning") && m.capabilities.includes("tool_calling"))).toBe(true);
    expect(rows((await call(models, "/api/models?open=1&pageSize=96")).body).every((m) => m.openWeights)).toBe(true);
    const free = rows((await call(models, "/api/models?free=1&pageSize=96")).body);
    expect(free.length).toBeGreaterThan(0);
    expect(free.every((m) => m.isFree)).toBe(true);
    const mm = rows((await call(models, "/api/models?multimodal=1&pageSize=96")).body);
    expect(mm.every((m) => m.inputModalities.some((x) => x !== "TEXT"))).toBe(true);
  });
  it("filters by provider, type, context and price limits", async () => {
    const prov = (await call(models, "/api/models?provider=amazon-bedrock&pageSize=96")).body;
    expect(prov.meta.total).toBeGreaterThan(0);
    expect(rows(prov).every((m) => m.providers.length > 0)).toBe(true);
    expect(rows((await call(models, "/api/models?type=embedding&pageSize=96")).body).every((m) => m.type === "EMBEDDING")).toBe(true);
    const lim = rows((await call(models, "/api/models?minContext=1000000&maxInput=1&maxOutput=5&pageSize=96")).body);
    expect(lim.length).toBeGreaterThan(0);
    expect(lim.every((m) => (m.contextWindow ?? 0) >= 1_000_000 && (m.inputPrice ?? 99) <= 1 && (m.outputPrice ?? 99) <= 5)).toBe(true);
  });
  it("excludes deprecated models unless asked", async () => {
    expect(rows((await call(models, "/api/models?pageSize=96")).body).every((m) => m.status !== "DEPRECATED")).toBe(true);
    const all = (await call(models, "/api/models?deprecated=1&pageSize=96&q=gpt-4")).body;
    expect(rows(all).some((m) => m.status === "DEPRECATED")).toBe(true);
  });
  it("sorts by price, context, release date and name with nulls last", async () => {
    const asc = rows((await call(models, "/api/models?sort=input_price&dir=asc&pageSize=96&type=text")).body).map((m) => m.inputPrice);
    const defined = asc.filter((v): v is number => v !== null);
    expect(defined).toEqual([...defined].sort((a, b) => a - b));
    expect(asc.indexOf(null) === -1 || asc.slice(asc.indexOf(null)).every((v) => v === null)).toBe(true);
    const ctx = rows((await call(models, "/api/models?sort=context&dir=desc&pageSize=48")).body).map((m) => m.contextWindow ?? 0);
    expect(ctx).toEqual([...ctx].sort((a, b) => b - a));
    const rel = rows((await call(models, "/api/models?sort=released&pageSize=24")).body).map((m) => m.releaseDate).filter(Boolean) as string[];
    expect(rel).toEqual([...rel].sort().reverse());
  });
  it("falls back to defaults on invalid sort / paging instead of failing", async () => {
    const { status, body } = await call(models, "/api/models?sort=hax&page=-1&pageSize=7");
    expect(status).toBe(200);
    expect(body.meta).toMatchObject({ page: 1, pageSize: 24 });
  });
  it("rejects out-of-range numeric filters with a 400 validation error", async () => {
    const { status, body } = await call(models, "/api/models?minContext=-1");
    expect(status).toBe(400);
    expect(body).toMatchObject({ ok: false, error: { code: "VALIDATION_ERROR" } });
  });
  it("is safe against SQL-injection-style input", async () => {
    const { status, body } = await call(models, `/api/models?q=${encodeURIComponent("'; DROP TABLE \"Model\"; --")}`);
    expect(status).toBe(200);
    expect(body.meta.total).toBe(0);
    expect((await call(health, "/api/health")).body.data.models).toBeGreaterThan(100);
  });
});

describe("GET /api/models/:id", () => {
  it("returns detail by canonical id and by database id, with listings, capabilities and related models", async () => {
    const first = rows((await call(models, "/api/models?q=gpt-4o&pageSize=1")).body)[0] ?? rows((await call(models, "/api/models?pageSize=1")).body)[0];
    const byCanon = await call(modelById, `/api/models/${encodeURIComponent(first.canonicalId)}`, params({ id: encodeURIComponent(first.canonicalId) }));
    expect(byCanon.status).toBe(200);
    expect(byCanon.body.data).toMatchObject({ canonicalId: first.canonicalId });
    expect(byCanon.body.data.listings.length).toBeGreaterThan(0);
    expect(Array.isArray(byCanon.body.data.related)).toBe(true);
    expect(byCanon.body.data.related.every((r: ModelRow) => r.id !== first.id)).toBe(true);
    const byId = await call(modelById, `/api/models/${first.id}`, params({ id: first.id }));
    expect(byId.body.data.canonicalId).toBe(first.canonicalId);
  });
  it("returns 404 for unknown models", async () => {
    const a = await call(modelById, "/api/models/x", params({ id: "nope%2Fnope" }));
    const b = await call(modelById, "/api/models/x", params({ id: "cmxxxxxxxxxxxxxxxxxxxxxxx" }));
    expect([a.status, b.status]).toEqual([404, 404]);
    expect(a.body.error.code).toBe("NOT_FOUND");
  });
});

describe("comparison", () => {
  it("returns the requested models in order, with scores, capped at 5", async () => {
    const ids = rows((await call(models, "/api/models?type=text&pageSize=8&sort=popularity")).body).map((m) => m.canonicalId);
    const cmp = await getComparison([ids[2], ids[0], ids[1], ids[0], ids[3], ids[4], ids[5], ids[6]]);
    expect(cmp.models.map((m) => m.canonicalId)).toEqual([ids[2], ids[0], ids[1], ids[3], ids[4]]);
    expect((await getComparison([])).models).toEqual([]);
    expect((await getComparison(["nope/nope"])).models).toEqual([]);
  });
});

describe("rankings and benchmarks", () => {
  it.each(["overall", "intelligence", "coding", "reasoning", "vision", "agentic", "performance"])("%s ranking is ordered, sequential and flagged simulated", async (category) => {
    const { status, body } = await call(rankings, `/api/rankings?category=${category}&limit=20`);
    expect(status).toBe(200);
    expect(body.meta.simulated).toBe(true);
    const r = body.data as { rank: number; score: number; isSimulated: boolean }[];
    expect(r).toHaveLength(20);
    expect(r.map((x) => x.rank)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
    expect(r.map((x) => x.score)).toEqual([...r.map((x) => x.score)].sort((a, b) => b - a));
    expect(r.every((x) => x.isSimulated)).toBe(true);
  });
  it("supports top 10 / 20 / 50 and ignores invalid sizes", async () => {
    for (const [lim, want] of [[10, 10], [50, 50], [7, 20]] as const) expect((await call(rankings, `/api/rankings?limit=${lim}`)).body.data).toHaveLength(want);
  });
  it("vision ranking only contains vision-capable models", async () => {
    const r = (await call(rankings, "/api/rankings?category=vision&limit=50")).body.data as { model: ModelRow }[];
    expect(r.every((x) => x.model.capabilities.includes("vision"))).toBe(true);
  });
  it("every benchmark is simulated and has a methodology; detail exposes stats and a sorted board", async () => {
    const list = (await call(benchmarks, "/api/benchmarks")).body;
    expect(list.data.length).toBeGreaterThanOrEqual(7);
    expect(list.data.every((b: { isSimulated: boolean; methodology: string }) => b.isSimulated && b.methodology)).toBe(true);
    const d = await call(benchmarkBySlug, "/api/benchmarks/coding-index?limit=20", params({ slug: "coding-index" }));
    expect(d.body.meta.stats.count).toBeGreaterThan(20);
    expect(d.body.meta.stats.max).toBeGreaterThanOrEqual(d.body.meta.stats.min);
    expect((await call(benchmarkBySlug, "/api/benchmarks/nope", params({ slug: "nope" }))).status).toBe(404);
  });
});

describe("labs, providers, search, stats", () => {
  it("lists labs with consistent open/closed counts and serves lab detail", async () => {
    const l = (await call(labs, "/api/labs")).body.data as { slug: string; modelCount: number; openCount: number; closedCount: number }[];
    expect(l.length).toBeGreaterThanOrEqual(7);
    expect(l.every((x) => x.openCount + x.closedCount === x.modelCount)).toBe(true);
    for (const must of ["openai", "anthropic", "google", "meta", "deepseek", "mistral", "alibaba"]) expect(l.map((x) => x.slug)).toContain(must);
    const d = await call(labBySlug, "/api/labs/anthropic", params({ slug: "anthropic" }));
    expect(d.body.data.lab.name).toBe("Anthropic");
    expect(d.body.data.models.every((m: ModelRow) => m.lab.slug === "anthropic")).toBe(true);
    expect((await call(labBySlug, "/api/labs/nope", params({ slug: "nope" }))).status).toBe(404);
    expect((await call(labs, "/api/labs?q=deepseek")).body.data.map((x: { slug: string }) => x.slug)).toEqual(["deepseek"]);
  });
  it("lists and filters providers, and serves provider listings with prices", async () => {
    const all = (await call(providers, "/api/providers")).body.data as { slug: string; modelCount: number; type: string }[];
    expect(all.length).toBeGreaterThan(20);
    expect((await call(providers, "/api/providers?type=GATEWAY")).body.data.every((p: { type: string }) => p.type === "GATEWAY")).toBe(true);
    const slug = all[0].slug;
    const d = await call(providerBySlug, `/api/providers/${slug}?pageSize=5`, params({ slug }));
    expect(d.body.data.slug).toBe(slug);
    expect(d.body.meta.listings.length).toBeGreaterThan(0);
    expect(d.body.meta.listings[0]).toHaveProperty("providerModelId");
    expect((await call(providerBySlug, "/api/providers/nope", params({ slug: "nope" }))).status).toBe(404);
  });
  it("search returns grouped results, validates input and finds labs/providers", async () => {
    const s = (await call(search, "/api/search?q=anthropic")).body.data;
    expect(s.labs.map((l: { slug: string }) => l.slug)).toContain("anthropic");
    expect((await call(search, "/api/search?q=bedrock")).body.data.providers.length).toBeGreaterThan(0);
    expect((await call(search, "/api/search")).status).toBe(400);
    expect((await call(search, `/api/search?q=${"x".repeat(200)}`)).status).toBe(400);
  });
  it("stats are internally consistent", async () => {
    const o = (await call(stats, "/api/stats")).body.data;
    expect(o.counts.models).toBeGreaterThan(100);
    expect(o.typeDistribution.reduce((s: number, t: { count: number }) => s + t.count, 0)).toBe(o.counts.models);
    expect(o.compareShortcuts.every((c: { ids: string[] }) => c.ids.length >= 3)).toBe(true);
    expect(o.recent.every((m: ModelRow) => m.releaseDate)).toBe(true);
  });
});

describe("rate limiting", () => {
  it("returns 429 with the standard error envelope after the limit", async () => {
    const mk = () => new NextRequest("http://localhost/api/search?q=a", { headers: { "x-forwarded-for": "203.0.113.9" } });
    let last = 200;
    for (let i = 0; i < 70; i++) last = (await (search as unknown as (r: NextRequest) => Promise<Response>)(mk())).status;
    expect(last).toBe(429);
  });
});
