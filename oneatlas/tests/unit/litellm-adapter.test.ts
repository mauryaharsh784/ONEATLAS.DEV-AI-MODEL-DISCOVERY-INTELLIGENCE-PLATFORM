import { describe, expect, it } from "vitest";

import { buildCatalog, buildSnapshot } from "@/services/ingest/litellm";

const base = { mode: "chat", max_input_tokens: 100000, max_output_tokens: 8000 };
const raw = {
  sample_spec: { mode: "chat", litellm_provider: "openai" },
  "gpt-x": { ...base, litellm_provider: "openai", input_cost_per_token: 0.000001, output_cost_per_token: 0.000004, cache_read_input_token_cost: 1e-7, supports_vision: true, supports_function_calling: true, supports_reasoning: false },
  "gpt-x-2025-01-15": { ...base, litellm_provider: "openai", input_cost_per_token: 0.000001, output_cost_per_token: 0.000004 },
  "azure/gpt-x": { ...base, litellm_provider: "azure", input_cost_per_token: 0.0000011, output_cost_per_token: 0.0000044, input_cost_per_token_above_200k_tokens: 0.000002, output_cost_per_token_above_200k_tokens: 0.000008 },
  "claude-y": { ...base, litellm_provider: "anthropic", input_cost_per_token: 0.000003, output_cost_per_token: 0.000015, deprecation_date: "2020-01-01" },
  "bedrock/us-east-1/anthropic.claude-y-20250101-v1:0": { ...base, litellm_provider: "bedrock", input_cost_per_token: 0.000003, output_cost_per_token: 0.000015 },
  "dashscope/deepseek-z": { ...base, litellm_provider: "dashscope", input_cost_per_token: 0.0000003, output_cost_per_token: 0.000001 },
  "deepseek/deepseek-z": { ...base, litellm_provider: "deepseek", input_cost_per_token: 0.0000002, output_cost_per_token: 0.0000009 },
  "together_ai/deepseek-ai/deepseek-z": { ...base, litellm_provider: "together_ai", input_cost_per_token: 0.0000004, output_cost_per_token: 0.000002 },
  "fireworks_ai/accounts/fireworks/models/deepseek-z": { ...base, litellm_provider: "fireworks_ai", input_cost_per_token: 0.0000004, output_cost_per_token: 0.000002 },
  "gpt-oss-w": { ...base, litellm_provider: "openai", input_cost_per_token: 1e-7, output_cost_per_token: 5e-7 },
  "groq/gpt-oss-w": { ...base, litellm_provider: "groq", input_cost_per_token: 1e-7, output_cost_per_token: 5e-7 },
  "cerebras/gpt-oss-w": { ...base, litellm_provider: "cerebras", input_cost_per_token: 1e-7, output_cost_per_token: 5e-7 },
  "replicate/gpt-x": { ...base, litellm_provider: "replicate", input_cost_per_token: 0.000001 },
  "deepinfra/claude-y": { ...base, litellm_provider: "deepinfra", input_cost_per_token: 0.000003 },
  "together_ai/gpt-x": { ...base, litellm_provider: "together_ai", input_cost_per_token: 0.000001 },
  "azure/orphan-model": { ...base, litellm_provider: "azure", input_cost_per_token: 0.000001 },
  "text-embedding-q": { mode: "embedding", litellm_provider: "openai", max_input_tokens: 8191, input_cost_per_token: 1e-8 },
  "ft:gpt-x:custom": { ...base, litellm_provider: "openai" },
};
const cat = buildCatalog(raw as never, new Date("2026-11-21"));
const get = (id: string) => cat.models.find((m) => m.canonicalId === id)!;

describe("buildCatalog", () => {
  it("creates one model per anchor (lab, type, slug) and folds dated snapshots into the base model", () => {
    expect(cat.models.map((m) => m.canonicalId).sort()).toEqual(["anthropic/claude-y", "deepseek/deepseek-z", "openai/gpt-oss-w", "openai/gpt-x", "openai/text-embedding-q"]);
  });
  it("skips fine-tunes, wildcard and sample_spec entries, and entries with no first-party anchor", () => {
    expect(cat.models.find((m) => m.slug.includes("orphan") || m.slug.includes("custom"))).toBeUndefined();
  });
  it("converts per-token prices to USD per 1M tokens", () => {
    const p = get("openai/gpt-x").listings.find((l) => l.providerModelId === "gpt-x")!.pricing[0];
    expect(p).toMatchObject({ tier: "STANDARD", inputPerMTok: 1, outputPerMTok: 4, cacheReadPerMTok: 0.1, isFree: false });
  });
  it("attaches third-party listings, with first-party flag and region", () => {
    const gpt = get("openai/gpt-x");
    expect(gpt.listings.map((l) => l.provider.slug).sort()).toEqual(["azure-openai", "openai", "openai", "replicate", "together-ai"]);
    expect(gpt.listings.filter((l) => l.isFirstParty)).toHaveLength(2);
    const claude = get("anthropic/claude-y").listings.find((l) => l.provider.slug === "amazon-bedrock")!;
    expect(claude).toMatchObject({ region: "us-east-1", isFirstParty: false });
  });
  it("creates a LONG_CONTEXT tier from *_above_200k_tokens prices", () => {
    const azure = get("openai/gpt-x").listings.find((l) => l.provider.slug === "azure-openai")!;
    expect(azure.pricing.find((p) => p.tier === "LONG_CONTEXT")).toMatchObject({ contextThreshold: 200000, inputPerMTok: 2, outputPerMTok: 8 });
  });
  it("parses release dates from snapshot identifiers and marks deprecation", () => {
    expect(get("openai/gpt-x").releaseDate).toBe("2025-01-15");
    expect(get("openai/gpt-x").releaseSource).toBe("SNAPSHOT_ID");
    expect(get("anthropic/claude-y").status).toBe("DEPRECATED");
    expect(get("openai/gpt-x").status).toBe("ACTIVE");
  });
  it("derives capabilities (explicit false becomes NO, absent is omitted)", () => {
    const caps = Object.fromEntries(get("openai/gpt-x").capabilities.map((c) => [c.key, c.support]));
    expect(caps).toEqual({ vision: "YES", tool_calling: "YES", reasoning: "NO" });
    expect(get("openai/gpt-x").inputModalities).toEqual(["TEXT", "IMAGE"]);
  });
  it("credits models hosted by aggregators to the right lab and infers open weights from open-model hosts", () => {
    const ds = get("deepseek/deepseek-z");
    expect(ds.listings.find((l) => l.provider.slug === "alibaba-cloud")!.isFirstParty).toBe(false);
    expect(ds.openWeights).toBe(true); // listed by two open-model hosts (Together + Fireworks)
  });
  it("does not call a model open-weight on weak evidence (single host, proxy hosts, closed labs)", () => {
    expect(get("openai/gpt-x").openWeights).toBe(false);    // one open host (Together) + a proxy host (Replicate)
    expect(get("anthropic/claude-y").openWeights).toBe(false); // DeepInfra proxies proprietary models
    expect(get("openai/gpt-oss-w").openWeights).toBe(true);  // closed lab, but the gpt-oss family is open and multi-hosted
  });
  it("types embeddings by mode", () => {
    expect(get("openai/text-embedding-q")).toMatchObject({ type: "EMBEDDING", outputModalities: [] });
  });
  it("snapshot keeps only anchored entries and drops unused fields", () => {
    const snap = buildSnapshot(raw as never);
    expect(Object.keys(snap)).not.toContain("azure/orphan-model");
    expect(Object.keys(snap)).toContain("azure/gpt-x");
  });
});
