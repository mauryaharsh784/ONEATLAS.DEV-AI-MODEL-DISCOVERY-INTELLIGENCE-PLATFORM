/**
 * Adapter: LiteLLM public model registry → OneAtlas catalog records.
 * Source: https://github.com/BerriAI/litellm (model_prices_and_context_window.json), community-maintained.
 *
 * Pure functions only (no I/O, no database) so the whole transformation is unit-testable.
 *
 * Model identity: an entry from a lab's OWN provider (see ANCHORS) defines a Model. Entries from any other
 * provider are attached as *listings* of that model when their canonical slug (provider prefixes, regions,
 * snapshot dates and version suffixes stripped) equals the model's slug. That match is a heuristic.
 */
import { ANCHORS, CLOSED_LABS, LABS, OPEN_HOST_MIN, OPEN_WEIGHT_HOSTS, resolveProvider, type ProviderMeta } from "./reference";
import { OBSERVED_RELEASES } from "./observed-releases";
import { canonicalize, familyOf, prettyName } from "./slug";

export const LITELLM_URL =
  "https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json";

export type ModelTypeName = "TEXT" | "IMAGE" | "EMBEDDING" | "VIDEO" | "SPEECH" | "TRANSCRIPTION" | "RERANKING" | "REALTIME";
export type ModalityName = "TEXT" | "IMAGE" | "AUDIO" | "VIDEO" | "FILE";
export type TierName = "STANDARD" | "LONG_CONTEXT" | "BATCH";

const MODE_TYPE: Record<string, ModelTypeName> = {
  chat: "TEXT", responses: "TEXT", embedding: "EMBEDDING", image_generation: "IMAGE", video_generation: "VIDEO",
  audio_transcription: "TRANSCRIPTION", audio_speech: "SPEECH", realtime: "REALTIME", rerank: "RERANKING",
};
const TYPE_LABEL: Record<ModelTypeName, string> = {
  TEXT: "text", IMAGE: "image generation", EMBEDDING: "embedding", VIDEO: "video generation", SPEECH: "speech",
  TRANSCRIPTION: "transcription", RERANKING: "reranking", REALTIME: "realtime",
};

export const CAPABILITY_DEFS = [
  { key: "reasoning", name: "Reasoning", flag: "supports_reasoning", description: "Can spend extra compute on step-by-step reasoning before answering." },
  { key: "vision", name: "Vision", flag: "supports_vision", description: "Accepts images as input." },
  { key: "tool_calling", name: "Tool calling", flag: "supports_function_calling", description: "Can call developer-defined functions / tools." },
  { key: "structured_output", name: "Structured output", flag: "supports_response_schema", description: "Can return JSON that conforms to a supplied schema." },
  { key: "prompt_caching", name: "Prompt caching", flag: "supports_prompt_caching", description: "Supports discounted re-use of cached prompt prefixes." },
  { key: "pdf_input", name: "PDF input", flag: "supports_pdf_input", description: "Accepts PDF documents as input." },
  { key: "audio_input", name: "Audio input", flag: "supports_audio_input", description: "Accepts audio as input." },
  { key: "web_search", name: "Web search", flag: "supports_web_search", description: "Offers built-in web search." },
  { key: "computer_use", name: "Computer use", flag: "supports_computer_use", description: "Can operate a computer interface via tool calls." },
  { key: "parallel_tools", name: "Parallel tool calls", flag: "supports_parallel_function_calling", description: "Can request several tool calls in one turn." },
] as const;

type Raw = Record<string, unknown>;
const num = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
const str = (v: unknown): string | undefined => (typeof v === "string" && v ? v : undefined);
const per1M = (v: unknown): number | undefined => {
  const n = num(v);
  return n === undefined ? undefined : Number((n * 1e6).toFixed(8));
};

export interface NormalizedPricing {
  tier: TierName; contextThreshold?: number;
  inputPerMTok?: number; outputPerMTok?: number; cacheReadPerMTok?: number; cacheWritePerMTok?: number;
  reasoningPerMTok?: number; audioInPerMTok?: number; audioOutPerMTok?: number; isFree: boolean;
}
export interface NormalizedListing {
  provider: ProviderMeta; providerModelId: string; region: string | null; isFirstParty: boolean;
  contextWindow?: number; maxOutputTokens?: number; features: Record<string, boolean>;
  pricing: NormalizedPricing[]; sourceUrl: string;
}
export interface NormalizedModel {
  labSlug: string; slug: string; canonicalId: string; name: string; family: string; type: ModelTypeName;
  status: "ACTIVE" | "DEPRECATED"; releaseDate: string | null; releaseSource: "SNAPSHOT_ID" | "OBSERVED" | null; releaseUrl?: string;
  contextWindow?: number; maxInputTokens?: number; maxOutputTokens?: number;
  inputModalities: ModalityName[]; outputModalities: ModalityName[];
  capabilities: { key: string; support: "YES" | "NO" }[];
  openWeights: boolean; description: string; sourceUrl: string; supportedParameters: string[];
  listings: NormalizedListing[];
}

interface Entry { key: string; provider: string; lab: string | null; mode: string; type: ModelTypeName; slug: string; snapshotDate: string | null; region: string | null; raw: Raw }

/**
 * Aggregator "anchors" (Alibaba's Model Studio, Volcengine, Tencent) also host other labs' models, so for
 * them the lab is taken from the model name when it clearly belongs elsewhere (deepseek-*, kimi-*, glm-* …).
 */
const AGGREGATOR_ANCHORS = new Set(["dashscope", "volcengine", "tencent"]);
const SLUG_LAB_HINTS: [RegExp, string][] = [
  [/^deepseek/, "deepseek"], [/^(kimi|moonshot)/, "moonshot-ai"], [/^glm/, "zhipu-ai"], [/^minimax/, "minimax"],
  [/^llama/, "meta"], [/^(qwen|qwq|qvq)/, "alibaba"], [/^(doubao|seed)/, "bytedance"], [/^mistral/, "mistral"],
];
export function entryLab(provider: string, slug: string): string | null {
  const base = ANCHORS[provider] ?? null;
  if (!base || !AGGREGATOR_ANCHORS.has(provider)) return base;
  return SLUG_LAB_HINTS.find(([re]) => re.test(slug))?.[1] ?? base;
}

function parseEntries(data: Record<string, Raw>): Entry[] {
  const out: Entry[] = [];
  for (const [key, raw] of Object.entries(data)) {
    if (key === "sample_spec" || key.includes("*") || key.startsWith("ft:")) continue;
    const mode = str(raw.mode);
    const provider = str(raw.litellm_provider);
    if (!mode || !provider || !MODE_TYPE[mode]) continue;
    const c = canonicalize(key);
    if (!c.slug) continue;
    out.push({ key, provider, lab: entryLab(provider, c.slug), mode, type: MODE_TYPE[mode], slug: c.slug, snapshotDate: c.snapshotDate, region: c.region, raw });
  }
  return out;
}

function pricingFor(raw: Raw): NormalizedPricing[] {
  const rows: NormalizedPricing[] = [];
  const input = per1M(raw.input_cost_per_token);
  const output = per1M(raw.output_cost_per_token);
  if (input !== undefined || output !== undefined) {
    rows.push({
      tier: "STANDARD", inputPerMTok: input, outputPerMTok: output,
      cacheReadPerMTok: per1M(raw.cache_read_input_token_cost), cacheWritePerMTok: per1M(raw.cache_creation_input_token_cost),
      reasoningPerMTok: per1M(raw.output_cost_per_reasoning_token),
      audioInPerMTok: per1M(raw.input_cost_per_audio_token), audioOutPerMTok: per1M(raw.output_cost_per_audio_token),
      isFree: input === 0 && output === 0,
    });
    const thresholds = Object.keys(raw).map((k) => k.match(/^input_cost_per_token_above_(\d+)k_tokens$/)).filter(Boolean)
      .map((m) => Number(m![1])).sort((a, b) => a - b);
    if (thresholds.length) {
      const k = thresholds[0];
      rows.push({
        tier: "LONG_CONTEXT", contextThreshold: k * 1000,
        inputPerMTok: per1M(raw[`input_cost_per_token_above_${k}k_tokens`]),
        outputPerMTok: per1M(raw[`output_cost_per_token_above_${k}k_tokens`]),
        cacheReadPerMTok: per1M(raw[`cache_read_input_token_cost_above_${k}k_tokens`]), isFree: false,
      });
    }
    const bi = per1M(raw.input_cost_per_token_batches), bo = per1M(raw.output_cost_per_token_batches);
    if (bi !== undefined || bo !== undefined) rows.push({ tier: "BATCH", inputPerMTok: bi, outputPerMTok: bo, isFree: false });
  }
  return rows;
}

function featuresOf(raw: Raw): Record<string, boolean> {
  const f: Record<string, boolean> = {};
  for (const c of CAPABILITY_DEFS) if (typeof raw[c.flag] === "boolean") f[c.key] = raw[c.flag] as boolean;
  if (typeof raw.supports_native_structured_output === "boolean" && raw.supports_native_structured_output) f.structured_output = true;
  return f;
}

function modalities(type: ModelTypeName, raw: Raw): { input: ModalityName[]; output: ModalityName[] } {
  const input = new Set<ModalityName>(), output = new Set<ModalityName>();
  switch (type) {
    case "TRANSCRIPTION": input.add("AUDIO"); output.add("TEXT"); break;
    case "SPEECH": input.add("TEXT"); output.add("AUDIO"); break;
    case "IMAGE": input.add("TEXT"); output.add("IMAGE"); break;
    case "VIDEO": input.add("TEXT"); output.add("VIDEO"); break;
    case "EMBEDDING": case "RERANKING": input.add("TEXT"); break;
    default: input.add("TEXT"); output.add("TEXT");
  }
  if (type === "TEXT" || type === "REALTIME") {
    if (raw.supports_vision) input.add("IMAGE");
    if (raw.supports_pdf_input) input.add("FILE");
    if (raw.supports_audio_input) input.add("AUDIO");
    if (raw.supports_video_input) input.add("VIDEO");
    if (raw.supports_audio_output) output.add("AUDIO");
  }
  return { input: [...input], output: [...output] };
}

export interface CatalogResult {
  models: NormalizedModel[];
  providers: Map<string, ProviderMeta>;
  stats: { entries: number; anchorEntries: number; models: number; listings: number; pricingRows: number; unmatchedObserved: string[] };
}

export function buildCatalog(data: Record<string, Raw>, now = new Date()): CatalogResult {
  const entries = parseEntries(data);
  const anchorOrder = Object.keys(ANCHORS);
  const anchored = entries.filter((e) => e.lab);

  // 1. group anchor entries → one model per (lab, type, slug)
  const groups = new Map<string, Entry[]>();
  for (const e of anchored) {
    const k = `${e.lab}|${e.type}|${e.slug}`;
    (groups.get(k) ?? groups.set(k, []).get(k)!).push(e);
  }

  const models: NormalizedModel[] = [];
  const bySlug = new Map<string, NormalizedModel>(); // `${type}|${slug}`
  for (const [, group] of groups) {
    group.sort((a, b) =>
      anchorOrder.indexOf(a.provider) - anchorOrder.indexOf(b.provider) ||
      Number(a.snapshotDate !== null) - Number(b.snapshotDate !== null) || a.key.length - b.key.length);
    const rep = group[0];
    const labSlug = rep.lab!;
    const merged: Raw = {};
    for (const e of [...group].reverse()) Object.assign(merged, e.raw);
    Object.assign(merged, rep.raw);

    const dates = group.map((g) => g.snapshotDate).filter((d): d is string => !!d).sort();
    const observed = OBSERVED_RELEASES[rep.slug];
    const deprecation = group.map((g) => str(g.raw.deprecation_date)).filter((d): d is string => !!d).sort()[0];
    const { input, output } = modalities(rep.type, merged);
    const caps: { key: string; support: "YES" | "NO" }[] = [];
    for (const c of CAPABILITY_DEFS) {
      const v = merged[c.flag];
      const alt = c.key === "structured_output" ? merged.supports_native_structured_output : undefined;
      if (v === true || alt === true) caps.push({ key: c.key, support: "YES" });
      else if (v === false) caps.push({ key: c.key, support: "NO" });
    }
    const ctx = num(merged.max_input_tokens) ?? num(merged.max_tokens);
    const out = num(merged.max_output_tokens);
    const m: NormalizedModel = {
      labSlug, slug: rep.slug, canonicalId: `${labSlug}/${rep.slug}`, name: prettyName(rep.slug), family: familyOf(rep.slug),
      type: rep.type, status: deprecation && new Date(deprecation) <= now ? "DEPRECATED" : "ACTIVE",
      releaseDate: observed?.date ?? dates[0] ?? null,
      releaseSource: observed ? "OBSERVED" : dates[0] ? "SNAPSHOT_ID" : null, releaseUrl: observed?.url,
      contextWindow: ctx, maxInputTokens: num(merged.max_input_tokens), maxOutputTokens: out,
      inputModalities: input, outputModalities: output, capabilities: caps, openWeights: false, description: "",
      sourceUrl: str(rep.raw.source) ?? LITELLM_URL, supportedParameters: [], listings: [],
    };
    models.push(m);
    if (!bySlug.has(`${rep.type}|${rep.slug}`)) bySlug.set(`${rep.type}|${rep.slug}`, m);
  }

  // 2. attach every entry (own provider + third-party hosts) as a listing of its model
  const providers = new Map<string, ProviderMeta>();
  const seen = new Set<string>();
  let listings = 0, pricingRows = 0;
  for (const e of entries) {
    const model = bySlug.get(`${e.type}|${e.slug}`);
    if (!model) continue;
    const provider = resolveProvider(e.provider);
    const id = `${provider.slug}|${e.key}`;
    if (seen.has(id)) continue;
    seen.add(id);
    providers.set(provider.slug, provider);
    const pricing = pricingFor(e.raw);
    model.listings.push({
      provider, providerModelId: e.key, region: e.region, isFirstParty: ANCHORS[e.provider] === model.labSlug,
      contextWindow: num(e.raw.max_input_tokens) ?? num(e.raw.max_tokens), maxOutputTokens: num(e.raw.max_output_tokens),
      features: featuresOf(e.raw), pricing, sourceUrl: str(e.raw.source) ?? LITELLM_URL,
    });
    listings++; pricingRows += pricing.length;
  }

  // 3. derived fields that need the listings
  for (const m of models) {
    const hosts = new Set(m.listings.map((l) => l.provider.slug));
    const openHosts = [...hosts].filter((h) => OPEN_WEIGHT_HOSTS.has(h)).length;
    const closedLab = CLOSED_LABS[m.labSlug];
    m.openWeights = openHosts >= OPEN_HOST_MIN && !(closedLab && !closedLab.test(m.slug));
    const lab = LABS[m.labSlug].name;
    const bits = [`${m.name} is a ${TYPE_LABEL[m.type]} model from ${lab}`];
    if (m.contextWindow) bits.push(`with a ${m.contextWindow.toLocaleString("en-US")}-token context window`);
    let d = bits.join(" ") + ".";
    if (m.maxOutputTokens) d += ` It can generate up to ${m.maxOutputTokens.toLocaleString("en-US")} tokens per response.`;
    d += hosts.size ? ` It is listed by ${hosts.size} provider${hosts.size === 1 ? "" : "s"}.` : "";
    m.description = d;
    const params = new Set<string>();
    for (const c of m.capabilities) if (c.support === "YES") params.add({ tool_calling: "tools", structured_output: "response_format", reasoning: "reasoning" }[c.key] ?? "");
    m.supportedParameters = [...params].filter(Boolean);
  }

  const unmatchedObserved = Object.keys(OBSERVED_RELEASES).filter((s) => !models.some((m) => m.slug === s));
  return {
    models: models.filter((m) => m.listings.length > 0),
    providers,
    stats: { entries: entries.length, anchorEntries: anchored.length, models: models.length, listings, pricingRows, unmatchedObserved },
  };
}

/** Reduce the 5 MB registry to the entries and fields the adapter actually reads. */
export function buildSnapshot(data: Record<string, Raw>): Record<string, Raw> {
  const entries = parseEntries(data);
  const wanted = new Set(entries.filter((e) => e.lab).map((e) => `${e.type}|${e.slug}`));
  const keep = new Set(entries.filter((e) => wanted.has(`${e.type}|${e.slug}`)).map((e) => e.key));
  const fieldOk = (k: string) =>
    ["litellm_provider", "mode", "max_input_tokens", "max_output_tokens", "max_tokens", "source", "deprecation_date"].includes(k) ||
    k.startsWith("supports_") || /^(input|output)_cost_per_(token|audio_token|reasoning_token)/.test(k) ||
    /^cache_(read|creation)_input_token_cost(_above_\d+k_tokens)?$/.test(k) || k === "output_cost_per_reasoning_token";
  const out: Record<string, Raw> = {};
  for (const k of keep) out[k] = Object.fromEntries(Object.entries(data[k]).filter(([f]) => fieldOk(f)));
  return out;
}
