import type { Prisma } from "@/generated/prisma/client";
import type { Modality, ModelRow, ModelType } from "@/types/catalog";

export const num = (d: { toNumber(): number } | null | undefined): number | null => (d ? d.toNumber() : null);
export const iso = (d: Date | null | undefined): string | null => (d ? d.toISOString().slice(0, 10) : null);

/** Prisma `select` shared by every list/table/card so a ModelRow is always built the same way. */
export const modelRowSelect = {
  id: true, canonicalId: true, slug: true, name: true, family: true, description: true, type: true, status: true,
  contextWindow: true, maxOutputTokens: true, listInputPricePerMTok: true, listOutputPricePerMTok: true,
  listCacheReadPricePerMTok: true, isFree: true, openWeights: true, inputModalities: true, outputModalities: true,
  releaseDate: true, providerCount: true,
  lab: { select: { slug: true, name: true } },
  capabilities: { where: { support: "YES" }, select: { capability: { select: { key: true } } } },
  listings: { select: { provider: { select: { slug: true, name: true } } }, take: 24, orderBy: { isFirstParty: "desc" } },
} satisfies Prisma.ModelSelect;

export type ModelRowPayload = Prisma.ModelGetPayload<{ select: typeof modelRowSelect }>;

export function toModelRow(m: ModelRowPayload): ModelRow {
  const seen = new Set<string>();
  const providers = m.listings.map((l) => l.provider).filter((p) => !seen.has(p.slug) && seen.add(p.slug));
  return {
    id: m.id, canonicalId: m.canonicalId, slug: m.slug, name: m.name, family: m.family, description: m.description,
    type: m.type as ModelType, status: m.status, lab: m.lab,
    contextWindow: m.contextWindow, maxOutputTokens: m.maxOutputTokens,
    inputPrice: num(m.listInputPricePerMTok), outputPrice: num(m.listOutputPricePerMTok), cacheReadPrice: num(m.listCacheReadPricePerMTok),
    isFree: m.isFree, openWeights: m.openWeights,
    inputModalities: m.inputModalities as Modality[], outputModalities: m.outputModalities as Modality[],
    releaseDate: iso(m.releaseDate), providerCount: m.providerCount,
    capabilities: m.capabilities.map((c) => c.capability.key), providers: providers.slice(0, 5),
  };
}
