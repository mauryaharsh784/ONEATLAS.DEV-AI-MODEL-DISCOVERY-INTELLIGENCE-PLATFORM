/**
 * Release dates transcribed from public listings fetched on 2026-11-20
 * (oneatlas.dev model pages / catalog, openrouter.ai/models). Keyed by canonical model slug.
 * The registry used for pricing has no release dates, so these are the only dates not parsed
 * from a model-ID snapshot suffix. Only dates actually seen on those pages are listed.
 */
export const OBSERVED_AT = "2026-11-20";
export const OBSERVED_RELEASES: Record<string, { date: string; url: string }> = {
  "gpt-6.1-terra": { date: "2026-10-26", url: "https://oneatlas.dev/models/openai/gpt-6.1-terra" },
  "gpt-6.1-sol": { date: "2026-09-29", url: "https://oneatlas.dev/models/openai/gpt-6.1-terra" },
  "gpt-6-luna": { date: "2026-09-22", url: "https://oneatlas.dev/models/openai/gpt-6.1-terra" },
  "gpt-5.6-terra": { date: "2026-07-09", url: "https://oneatlas.dev/models/openai/gpt-6.1-terra" },
  "gpt-6.2-astra": { date: "2026-11-17", url: "https://openrouter.ai/models" },
  "gpt-6.2-sol": { date: "2026-11-17", url: "https://openrouter.ai/models" },
  "gemini-4-neon": { date: "2026-11-18", url: "https://openrouter.ai/models" },
  "qwen4-max": { date: "2026-11-16", url: "https://openrouter.ai/models" },
  "hy4": { date: "2026-11-04", url: "https://oneatlas.dev/" },
  "hy4-flash": { date: "2026-11-16", url: "https://openrouter.ai/models" },
  "kimi-k3.1-pro": { date: "2026-10-23", url: "https://oneatlas.dev/" },
  "minimax-m3.1-flash": { date: "2026-10-19", url: "https://oneatlas.dev/" },
  "deepseek-v4.1-flash-1017": { date: "2026-10-17", url: "https://oneatlas.dev/" },
  "mercury-3": { date: "2026-10-16", url: "https://oneatlas.dev/" },
  "gemini-omni-1.2-flash": { date: "2026-11-05", url: "https://oneatlas.dev/" },
  "muse-spark-open": { date: "2026-10-15", url: "https://oneatlas.dev/" },
};
