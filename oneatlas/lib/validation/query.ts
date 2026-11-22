import { z } from "zod";

type Raw = Record<string, string | string[] | undefined> | URLSearchParams;

function get(raw: Raw, key: string): string | undefined {
  if (raw instanceof URLSearchParams) return raw.getAll(key).join(",") || undefined;
  const v = raw[key];
  return Array.isArray(v) ? v.join(",") : v;
}
const csv = z.string().optional().transform((v) => (v ? v.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 40) : []));
const flag = z.string().optional().transform((v) => v === "1" || v === "true");
const posInt = (max: number) => z.coerce.number().int().min(0).max(max).optional();

export const MODEL_SORTS = ["popularity", "released", "context", "input_price", "output_price", "name"] as const;
export const PAGE_SIZES = [12, 24, 48, 96] as const;

export const modelQuerySchema = z.object({
  q: z.string().trim().max(100).optional().transform((v) => v || undefined),
  lab: csv, provider: csv, type: csv, cap: csv, ids: csv,
  open: flag, free: flag, multimodal: flag, deprecated: flag,
  minContext: posInt(100_000_000), maxInput: z.coerce.number().min(0).max(100000).optional(), maxOutput: z.coerce.number().min(0).max(100000).optional(),
  sort: z.enum(MODEL_SORTS).catch("popularity"),
  dir: z.enum(["asc", "desc"]).optional(),
  page: z.coerce.number().int().min(1).max(10000).catch(1),
  pageSize: z.coerce.number().int().refine((n) => (PAGE_SIZES as readonly number[]).includes(n)).catch(24),
});
export type ModelQuery = z.infer<typeof modelQuerySchema>;

const KEYS = ["q", "lab", "provider", "type", "cap", "ids", "open", "free", "multimodal", "deprecated", "minContext", "maxInput", "maxOutput", "sort", "dir", "page", "pageSize"] as const;
export function parseModelQuery(raw: Raw): ModelQuery {
  const o: Record<string, string | undefined> = {};
  for (const k of KEYS) o[k] = get(raw, k);
  return modelQuerySchema.parse(o);
}

export const listQuerySchema = z.object({
  q: z.string().trim().max(100).optional().transform((v) => v || undefined),
  type: z.string().optional(),
  sort: z.string().optional(),
  page: z.coerce.number().int().min(1).max(10000).catch(1),
  pageSize: z.coerce.number().int().min(1).max(100).catch(24),
});
export function parseListQuery(raw: Raw) {
  const o: Record<string, string | undefined> = {};
  for (const k of ["q", "type", "sort", "page", "pageSize"]) o[k] = get(raw, k);
  return listQuerySchema.parse(o);
}

export const RANKING_CATEGORIES = [
  { key: "overall", label: "Overall" }, { key: "intelligence", label: "Intelligence" }, { key: "coding", label: "Coding" },
  { key: "reasoning", label: "Reasoning" }, { key: "vision", label: "Vision" }, { key: "agentic", label: "Agentic" },
  { key: "performance", label: "Performance" },
] as const;
export const rankingQuerySchema = z.object({
  category: z.enum(RANKING_CATEGORIES.map((c) => c.key) as [string, ...string[]]).catch("overall"),
  limit: z.coerce.number().int().refine((n) => [10, 20, 50].includes(n)).catch(20),
});
export function parseRankingQuery(raw: Raw) {
  return rankingQuerySchema.parse({ category: get(raw, "category"), limit: get(raw, "limit") });
}
