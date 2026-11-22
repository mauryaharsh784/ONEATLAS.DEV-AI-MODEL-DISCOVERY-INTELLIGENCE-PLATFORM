/** Name / slug normalisation shared by every ingestion adapter. */

const DATE_SUFFIX = /[-@_.](20\d{2})(\d{2})(\d{2})$|[-@_.](20\d{2})-(\d{2})-(\d{2})$/;

export interface Canon {
  /** Base slug with snapshot date, version and "-latest" suffixes removed. */
  slug: string;
  /** Snapshot date parsed from the identifier (YYYY-MM-DD) if present. */
  snapshotDate: string | null;
  /** Region / routing prefix found in the identifier (us, eu, global, ap-northeast-1 …). */
  region: string | null;
}

const REGION_SEGMENT = /^(us|eu|ap|ca|sa|me|af|il)-[a-z]+-\d$/;
const ROUTING_PREFIX = new Set(["us", "eu", "apac", "global", "jp", "au", "ca", "us-gov"]);

/** "bedrock/us-east-1/anthropic.claude-haiku-4-5-20251001-v1:0" → { slug: "claude-haiku-4-5", … } */
export function canonicalize(key: string): Canon {
  let region: string | null = null;
  const segs = key.toLowerCase().trim().split("/");
  for (const s of segs.slice(0, -1)) if (REGION_SEGMENT.test(s)) region = s;
  let s = segs[segs.length - 1];
  // vendor / routing prefixes in dotted ids: "us.anthropic.claude-…", "meta.llama3-…"
  for (;;) {
    const m = s.match(/^([a-z][a-z-]*)\.(?=[a-z])/);
    if (!m) break;
    if (ROUTING_PREFIX.has(m[1])) region ??= m[1];
    s = s.slice(m[0].length);
  }
  s = s.replace(/@/g, "-").replace(/-v\d+(:\d+)?$/, "").replace(/:\d+$/, "");
  let snapshotDate: string | null = null;
  const d = s.match(DATE_SUFFIX);
  if (d) {
    const [y, mo, da] = d[1] ? [d[1], d[2], d[3]] : [d[4], d[5], d[6]];
    const month = Number(mo), day = Number(da);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      snapshotDate = `${y}-${mo}-${da}`;
      s = s.slice(0, d.index);
    }
  }
  s = s.replace(/-latest$/, "").replace(/[^a-z0-9.\-_]+/g, "-").replace(/^-+|-+$/g, "");
  return { slug: s, snapshotDate, region };
}

const UPPER = new Set(["gpt", "oss", "ai", "vl", "tts", "stt", "llm", "xl", "ocr", "api", "glm", "mmlu", "hy", "r1"]);
const SPECIAL: Record<string, string> = {
  deepseek: "DeepSeek", minimax: "MiniMax", xai: "xAI", openai: "OpenAI", gemma: "Gemma", llama: "Llama",
  mixtral: "Mixtral", codestral: "Codestral", ministral: "Ministral", devstral: "Devstral", magistral: "Magistral",
  qwen: "Qwen", kimi: "Kimi", grok: "Grok", claude: "Claude", gemini: "Gemini", mistral: "Mistral", nova: "Nova",
  jamba: "Jamba", command: "Command", sonar: "Sonar", doubao: "Doubao",
};

/** "claude-3-5-sonnet" → "Claude 3.5 Sonnet", "gpt-4o" → "GPT-4o", "llama-3.3-70b" → "Llama 3.3 70B". */
export function prettyName(slug: string): string {
  const raw = slug.split(/[-_]/).filter(Boolean);
  const toks: string[] = [];
  for (let i = 0; i < raw.length; i++) {
    const t = raw[i];
    const next = raw[i + 1];
    if (/^\d{1,2}$/.test(t) && next && /^\d{1,2}$/.test(next) && !/^\d{1,2}$/.test(raw[i + 2] ?? "x")) {
      toks.push(`${t}.${next}`); i++;
    } else toks.push(t);
  }
  const words = toks.map((t) => {
    if (SPECIAL[t]) return SPECIAL[t];
    if (UPPER.has(t)) return t.toUpperCase();
    if (/^\d+(\.\d+)?[bkm]$/.test(t)) return t.toUpperCase();
    if (/^a\d+b$/.test(t)) return t.toUpperCase();
    if (/^v\d/.test(t)) return t.toUpperCase();
    if (/^\d/.test(t)) return t;
    if (/^o\d/.test(t)) return t;
    return t.charAt(0).toUpperCase() + t.slice(1);
  });
  if (words[0] === "GPT" && words[1]) return `GPT-${words[1]}${words.length > 2 ? " " + words.slice(2).join(" ") : ""}`;
  return words.join(" ");
}

/** Family = leading name tokens before the first version-like token ("claude-3-5-sonnet" → "claude"). */
export function familyOf(slug: string): string {
  const t = slug.split(/[-_]/);
  const out: string[] = [];
  for (const x of t) { if (/\d/.test(x)) break; out.push(x); }
  return (out.length ? out : [t[0]]).slice(0, 2).join("-");
}

export function prettyId(id: string): string {
  return id.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).trim();
}

export function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
