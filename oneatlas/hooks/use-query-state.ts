"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useSyncExternalStore, useTransition } from "react";

/**
 * Optimistic copy of the query string, shared by every useQueryState() instance (sidebar, toolbar, chips).
 * Filters are server-rendered, so the real URL only updates after the server responds. Until then the
 * optimistic string is what every control reads and what the next change builds on, so a checkbox reacts
 * instantly and two quick clicks never overwrite each other. It is dropped as soon as the URL catches up.
 */
let optimistic: string | null = null;
let clearTimer: ReturnType<typeof setTimeout> | null = null;
const subscribers = new Set<() => void>();
const subscribe = (cb: () => void) => { subscribers.add(cb); return () => { subscribers.delete(cb); }; };
function setOptimistic(next: string | null) {
  optimistic = next;
  if (clearTimer) clearTimeout(clearTimer);
  // Safety net: if the navigation never changes the URL (e.g. it fails), fall back to the real URL.
  if (next !== null) clearTimer = setTimeout(() => setOptimistic(null), 8_000);
  subscribers.forEach((cb) => cb());
}

/** URL-backed state for filters: every change rewrites the query string and resets pagination. */
export function useQueryState() {
  const router = useRouter();
  const pathname = usePathname();
  const real = useSearchParams();
  const [pending, startTransition] = useTransition();
  const opt = useSyncExternalStore(subscribe, () => optimistic, () => null);
  const realString = real.toString();
  const params = useMemo(() => (opt !== null ? new URLSearchParams(opt) : real), [opt, real]);

  // The URL caught up with (or moved past) the optimistic value: stop overriding it.
  useEffect(() => { if (optimistic !== null) setOptimistic(null); }, [realString]);

  const push = useCallback((next: URLSearchParams) => {
    next.delete("page");
    const qs = next.toString();
    setOptimistic(qs);
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }, [pathname, router]);

  const current = () => new URLSearchParams(optimistic ?? realString);

  const set = useCallback((updates: Record<string, string | null | undefined>) => {
    const next = current();
    for (const [k, v] of Object.entries(updates)) { if (v === null || v === undefined || v === "") next.delete(k); else next.set(k, v); }
    push(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [push, realString]);

  const list = useCallback((key: string) => (params.get(key) ? params.get(key)!.split(",").filter(Boolean) : []), [params]);

  const toggle = useCallback((key: string, value: string) => {
    const cur = current().get(key)?.split(",").filter(Boolean) ?? [];
    const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
    set({ [key]: next.join(",") || null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [set, realString]);

  const clear = useCallback((keep: string[] = ["sort", "dir", "view", "pageSize"]) => {
    const cur = current();
    const next = new URLSearchParams();
    for (const k of keep) { const v = cur.get(k); if (v) next.set(k, v); }
    push(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [push, realString]);

  return { params, get: (k: string) => params.get(k) ?? "", flag: (k: string) => params.get(k) === "1", list, set, toggle, clear, pending };
}
