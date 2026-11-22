"use client";

import { Building2, Cpu, Loader2, Search, Server } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { EntityAvatar } from "@/components/shared/entity-avatar";
import { Input } from "@/components/ui/input";
import { formatPricePerMTok } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ModelRow } from "@/types/catalog";

interface Hit { href: string; label: string; sub: string; kind: "model" | "lab" | "provider"; meta?: string }
interface Payload { models: ModelRow[]; labs: { slug: string; name: string }[]; providers: { slug: string; name: string }[] }

/**
 * Global search with a live results dropdown (GET /api/search). Enter on a highlighted result opens it;
 * Enter with nothing highlighted searches the full catalog at /models?q=. ⌘K or "/" focuses it from anywhere.
 */
export function GlobalSearch({ className, size = "default", shortcut = true, autoFocus = false }: { className?: string; size?: "default" | "lg"; shortcut?: boolean; autoFocus?: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hits, setHits] = useState<Hit[]>([]);
  const [active, setActive] = useState(-1);
  const [error, setError] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!shortcut) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) { e.preventDefault(); ref.current?.focus(); ref.current?.select(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shortcut]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  useEffect(() => {
    const term = q.trim();
    if (!term) return; // nothing to fetch; the panel is hidden and stale hits are ignored below
    const ctl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true); setError(false);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}&limit=6`, { signal: ctl.signal });
        if (!res.ok) throw new Error(String(res.status));
        const body: { ok: boolean; data: Payload } = await res.json();
        const d = body.data;
        setHits([
          ...d.models.map((m): Hit => ({ href: `/models/${m.canonicalId}`, label: m.name, sub: `${m.lab.name} · ${m.canonicalId}`, kind: "model", meta: m.inputPrice !== null ? `${formatPricePerMTok(m.inputPrice)} in` : undefined })),
          ...d.labs.map((l): Hit => ({ href: `/labs/${l.slug}`, label: l.name, sub: "AI lab", kind: "lab" })),
          ...d.providers.map((p): Hit => ({ href: `/providers/${p.slug}`, label: p.name, sub: "Provider", kind: "provider" })),
        ]);
        setActive(-1);
      } catch (e) { if ((e as Error).name !== "AbortError") { setError(true); setHits([]); } }
      finally { setLoading(false); }
    }, 180);
    return () => { clearTimeout(t); ctl.abort(); };
  }, [q]);

  const shownHits = q.trim() ? hits : [];

  function go(href: string) { setOpen(false); router.push(href); }
  function submit() {
    if (active >= 0 && shownHits[active]) return go(shownHits[active].href);
    const term = q.trim();
    go(term ? `/models?q=${encodeURIComponent(term)}` : "/models");
  }
  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setActive((a) => Math.min(shownHits.length - 1, a + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(-1, a - 1)); }
    else if (e.key === "Enter") { e.preventDefault(); submit(); }
    else if (e.key === "Escape") { setOpen(false); ref.current?.blur(); }
  }

  const icon = { model: Cpu, lab: Building2, provider: Server };
  const showPanel = open && q.trim().length > 0;

  return (
    <div ref={box} role="search" className={cn("relative", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        ref={ref} value={q} autoFocus={autoFocus} type="search" autoComplete="off" role="combobox" aria-expanded={showPanel} aria-controls={listId} aria-autocomplete="list"
        placeholder="Search models, labs, providers, model IDs" aria-label="Search models, labs, providers and model IDs"
        onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onKeyDown={onKeyDown}
        className={cn("pl-9", shortcut && "pr-12", size === "lg" && "h-12 text-base")}
      />
      {loading ? <Loader2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        : shortcut && <kbd className="pointer-events-none absolute top-1/2 right-2.5 hidden -translate-y-1/2 rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:block">⌘K</kbd>}
      {showPanel && (
        <div id={listId} role="listbox" className="absolute top-full right-0 left-0 z-50 mt-1.5 overflow-hidden rounded-lg border bg-popover text-left shadow-lg">
          {error ? <p className="p-4 text-sm text-destructive">Search is unavailable right now. Try again in a moment.</p>
            : shownHits.length === 0 && !loading ? <p className="p-4 text-sm text-muted-foreground">No direct matches. Press Enter to search the catalog.</p>
            : <ul className="max-h-96 overflow-y-auto py-1">
                {shownHits.map((h, i) => { const Icon = icon[h.kind]; return (
                  <li key={h.href + i} role="option" aria-selected={i === active}>
                    <button type="button" onMouseEnter={() => setActive(i)} onClick={() => go(h.href)}
                      className={cn("flex w-full items-center gap-3 px-3 py-2 text-left text-sm", i === active && "bg-accent")}>
                      {h.kind === "model" ? <EntityAvatar name={h.sub.split(" · ")[0]} size={24} /> : <Icon className="size-6 rounded-md bg-muted p-1 text-muted-foreground" />}
                      <span className="min-w-0 flex-1"><span className="block truncate font-medium">{h.label}</span><span className="block truncate text-xs text-muted-foreground">{h.sub}</span></span>
                      {h.meta && <span className="num shrink-0 text-xs text-muted-foreground">{h.meta}</span>}
                    </button>
                  </li>); })}
              </ul>}
          <button type="button" onClick={() => go(`/models?q=${encodeURIComponent(q.trim())}`)} className="flex w-full items-center gap-2 border-t px-3 py-2 text-left text-xs text-muted-foreground hover:bg-accent">
            <Search className="size-3.5" /> Search all models for “{q.trim()}”
          </button>
        </div>
      )}
    </div>
  );
}
