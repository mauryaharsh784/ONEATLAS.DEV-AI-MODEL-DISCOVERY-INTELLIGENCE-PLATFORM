"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import { toast } from "sonner";

export const MAX_COMPARE = 5;
export interface CompareItem { id: string; name: string }
interface Ctx { items: CompareItem[]; has: (id: string) => boolean; toggle: (item: CompareItem) => void; remove: (id: string) => void; clear: () => void; href: string }

const KEY = "oneatlas:compare";
const EMPTY: CompareItem[] = [];

/** localStorage-backed external store (SSR-safe: the server snapshot is always empty). */
let cache: CompareItem[] | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function read(): CompareItem[] {
  if (cache) return cache;
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    cache = Array.isArray(parsed) ? parsed.filter((i) => i && typeof i.id === "string" && typeof i.name === "string").slice(0, MAX_COMPARE) : EMPTY;
  } catch { cache = EMPTY; }
  return cache;
}
function write(next: CompareItem[]) {
  cache = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* storage unavailable: in-memory only */ }
  emit();
}
function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => { if (e.key === KEY) { cache = null; cb(); } };
  window.addEventListener("storage", onStorage);
  return () => { listeners.delete(cb); window.removeEventListener("storage", onStorage); };
}

const CompareContext = createContext<Ctx | null>(null);

export function CompareProvider({ children }: { children: React.ReactNode }) {
  const items = useSyncExternalStore(subscribe, read, () => EMPTY);

  const toggle = useCallback((item: CompareItem) => {
    const cur = read();
    if (cur.some((i) => i.id === item.id)) {
      write(cur.filter((i) => i.id !== item.id));
      toast(`Removed ${item.name}`, { id: "compare", description: `${cur.length - 1} of ${MAX_COMPARE} selected`, duration: 2000 });
      return;
    }
    if (cur.length >= MAX_COMPARE) { toast.error(`You can compare up to ${MAX_COMPARE} models.`, { id: "compare" }); return; }
    write([...cur, item]);
    toast.success(`Added ${item.name}`, { id: "compare", description: `${cur.length + 1} of ${MAX_COMPARE} selected`, duration: 2000 });
  }, []);

  const value = useMemo<Ctx>(() => ({
    items, has: (id) => items.some((i) => i.id === id), toggle,
    remove: (id) => write(read().filter((i) => i.id !== id)),
    clear: () => { write([]); toast("Comparison cleared", { id: "compare", duration: 2000 }); },
    href: `/compare?${new URLSearchParams({ ids: items.map((i) => i.id).join(",") }).toString()}`,
  }), [items, toggle]);

  return <CompareContext.Provider value={value}>{children}</CompareContext.Provider>;
}

export function useCompare(): Ctx {
  const c = useContext(CompareContext);
  if (!c) throw new Error("useCompare must be used inside <CompareProvider>");
  return c;
}
