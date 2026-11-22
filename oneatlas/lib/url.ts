export type SP = Record<string, string | string[] | undefined>;

/** Build an href from the current search params with some keys changed (null removes). Resets `page` unless set. */
export function buildHref(path: string, sp: SP, updates: Record<string, string | null>): string {
  const next = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) { const val = Array.isArray(v) ? v.join(",") : v; if (val) next.set(k, val); }
  if (!("page" in updates)) next.delete("page");
  for (const [k, v] of Object.entries(updates)) { if (v === null) next.delete(k); else next.set(k, v); }
  const qs = next.toString();
  return qs ? `${path}?${qs}` : path;
}
