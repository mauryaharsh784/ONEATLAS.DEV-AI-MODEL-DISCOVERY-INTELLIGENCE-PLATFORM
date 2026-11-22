/** Display formatters shared by tables, cards, comparison and the cost calculator. */

const DASH = "—";

type Numeric = number | string | null | undefined;

function toNumber(value: Numeric): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

/** 1_050_000 → "1.05M", 128_000 → "128K", 8_192 → "8.2K", 512 → "512". */
export function formatTokens(value: Numeric): string {
  const n = toNumber(value);
  if (n === null) return DASH;
  const abs = Math.abs(n);
  const trim = (x: number, digits: number) => Number(x.toFixed(digits)).toString();
  if (abs >= 1_000_000_000) return `${trim(n / 1_000_000_000, 2)}B`;
  if (abs >= 1_000_000) return `${trim(n / 1_000_000, 2)}M`;
  if (abs >= 1_000) return `${trim(n / 1_000, abs >= 100_000 ? 0 : 1)}K`;
  return String(n);
}

/** Full grouped number, e.g. 1,050,000. */
export function formatInteger(value: Numeric): string {
  const n = toNumber(value);
  return n === null ? DASH : new Intl.NumberFormat("en-US").format(n);
}

/**
 * USD price per 1M tokens. Keeps enough precision for sub-cent prices
 * ($0.0083) without printing noise for round ones ($1.00).
 */
export function formatPricePerMTok(value: Numeric, opts: { free?: boolean } = {}): string {
  const n = toNumber(value);
  if (n === null) return opts.free ? "Free" : DASH;
  if (n === 0) return "Free";
  if (n >= 0.1) return `$${n.toFixed(2)}`;
  // < $0.10: show up to 4 significant decimals, trimming trailing zeros but keeping 2 minimum.
  const fixed = n.toFixed(4).replace(/0+$/, "");
  const [, frac = ""] = fixed.split(".");
  return `$${frac.length < 2 ? n.toFixed(2) : fixed}`;
}

/** Arbitrary USD amount (calculator results): more precision for tiny totals. */
export function formatUsd(value: Numeric): string {
  const n = toNumber(value);
  if (n === null) return DASH;
  if (n === 0) return "$0.00";
  const abs = Math.abs(n);
  const digits = abs >= 1 ? 2 : abs >= 0.01 ? 3 : 6;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: digits,
  }).format(n);
}

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return DASH;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return DASH;
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(d);
}

export function formatScore(value: Numeric, digits = 1): string {
  const n = toNumber(value);
  return n === null ? DASH : n.toFixed(digits);
}

/** "Open weights" / "Closed weights" label used on badges. */
export function weightsLabel(openWeights: boolean): string {
  return openWeights ? "Open weights" : "Closed weights";
}
