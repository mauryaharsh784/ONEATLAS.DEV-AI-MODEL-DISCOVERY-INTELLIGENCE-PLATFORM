/** Plain, JSON-safe DTOs returned by the service layer (no Decimal / Date objects). */
export type Modality = "TEXT" | "IMAGE" | "AUDIO" | "VIDEO" | "FILE";
export type ModelType = "TEXT" | "IMAGE" | "EMBEDDING" | "VIDEO" | "SPEECH" | "TRANSCRIPTION" | "RERANKING" | "REALTIME";

export interface ModelRow {
  id: string; canonicalId: string; slug: string; name: string; family: string | null; description: string | null;
  type: ModelType; status: "ACTIVE" | "PREVIEW" | "DEPRECATED";
  lab: { slug: string; name: string };
  contextWindow: number | null; maxOutputTokens: number | null;
  inputPrice: number | null; outputPrice: number | null; cacheReadPrice: number | null;
  isFree: boolean; openWeights: boolean;
  inputModalities: Modality[]; outputModalities: Modality[];
  releaseDate: string | null; providerCount: number;
  capabilities: string[];
  providers: { slug: string; name: string }[];
}

export interface Paginated<T> { items: T[]; total: number; page: number; pageSize: number; pageCount: number }

export interface ListingDTO {
  id: string; provider: { slug: string; name: string; type: string }; providerModelId: string; region: string | null;
  isFirstParty: boolean; contextWindow: number | null; maxOutputTokens: number | null;
  pricing: { tier: string; contextThreshold: number | null; input: number | null; output: number | null; cacheRead: number | null; cacheWrite: number | null; isFree: boolean }[];
  sourceUrl: string | null;
}

export interface ScoreDTO { slug: string; name: string; category: string; score: number; rank: number | null; unit: string | null; isSimulated: boolean }

export interface ModelDetail extends ModelRow {
  maxInputTokens: number | null; docsUrl: string | null; websiteUrl: string | null;
  supportedParameters: string[]; knowledgeCutoff: string | null; license: string | null;
  source: string; sourceUrl: string | null; sourceUpdatedAt: string | null; isSimulated: boolean;
  allCapabilities: { key: string; name: string; support: "YES" | "NO" | "UNKNOWN" }[];
  listings: ListingDTO[]; scores: ScoreDTO[]; releaseNote: string | null; releaseUrl: string | null;
}

export interface LabRow { slug: string; name: string; description: string | null; websiteUrl: string | null; headquarters: string | null; foundedYear: number | null; modelCount: number; openCount: number; closedCount: number; latestRelease: string | null }
export interface ProviderRow { slug: string; name: string; type: string; description: string | null; websiteUrl: string | null; docsUrl: string | null; modelCount: number; listingCount: number; minInputPrice: number | null }

export interface RankingRow { rank: number; model: ModelRow; score: number; unit: string | null; isSimulated: boolean; breakdown: Record<string, number> }
export interface BenchmarkRow { slug: string; name: string; category: string; description: string | null; methodology: string | null; unit: string | null; isSimulated: boolean; modelCount: number; top: { canonicalId: string; name: string; lab: string; score: number }[] }
