"use client";

import { ArrowUpDown, ChevronDown, LayoutGrid, Rows3, Search, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useState } from "react";

import { FiltersSidebar } from "@/components/catalog/filters-sidebar";
import { TYPE_LABEL } from "@/components/catalog/icons";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useQueryState } from "@/hooks/use-query-state";
import { cn } from "@/lib/utils";
import type { Facets } from "@/services/models";

const SORTS: [string, string][] = [
  ["popularity:desc", "Most available"], ["released:desc", "Newest first"], ["context:desc", "Longest context"],
  ["input_price:asc", "Input price: low → high"], ["input_price:desc", "Input price: high → low"],
  ["output_price:asc", "Output price: low → high"], ["name:asc", "Name A–Z"],
];
const PAGE_SIZES = [12, 24, 48, 96];

/** Dropdown that behaves like a select: the trigger shows the current value, the open item carries a check. */
function MenuSelect({ label, icon: Icon, display, ariaValue, options, value, onSelect, className }: { label: string; icon?: typeof ArrowUpDown; display: React.ReactNode; ariaValue: string; options: [string, string][]; value: string; onSelect: (v: string) => void; className?: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" aria-label={`${label}: ${ariaValue}`} className={cn("group inline-flex h-10 items-center gap-2 rounded-lg border border-input bg-card px-3 text-sm outline-none transition-colors hover:bg-accent/60 focus-visible:ring-[3px] focus-visible:ring-ring data-[state=open]:border-primary/50 data-[state=open]:bg-accent/60", className)}>
          {Icon && <Icon className="size-4 text-muted-foreground" />}
          <span className="truncate">{display}</span>
          <ChevronDown className="size-3.5 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-52">
        {options.map(([v, l]) => (
          <DropdownMenuCheckboxItem key={v} checked={v === value} onSelect={() => onSelect(v)}>{l}</DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const chipClass = "pop group inline-flex h-6 items-center gap-1 rounded-md border border-primary/25 bg-primary/10 pr-1 pl-2 text-xs text-foreground transition-colors hover:border-primary/50 hover:bg-primary/15 focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none";

export function CatalogToolbar({ facets, total, defaultView = "table" }: { facets: Facets; total: number; defaultView?: "table" | "grid" }) {
  const qs = useQueryState();
  const urlQ = qs.get("q");
  const [q, setQ] = useState(urlQ);
  const [seenUrlQ, setSeenUrlQ] = useState(urlQ);
  const [sheet, setSheet] = useState(false);
  // URL changed externally (chip removed, back button…): adopt it during render instead of in an effect.
  if (urlQ !== seenUrlQ) { setSeenUrlQ(urlQ); setQ(urlQ); }
  useEffect(() => {
    if (q === urlQ) return;
    const t = setTimeout(() => qs.set({ q: q.trim() || null }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const view = qs.get("view") || defaultView;
  const sort = `${qs.get("sort") || "popularity"}:${qs.get("dir") || (["input_price", "output_price", "name"].includes(qs.get("sort")) ? "asc" : "desc")}`;
  const pageSize = qs.get("pageSize") || "24";
  const sortLabel = SORTS.find(([v]) => v === sort)?.[1] ?? "Custom sort";

  // Human-readable chips: resolve slugs to the names shown in the sidebar.
  const labName = new Map(facets.labs.map((l) => [l.slug, l.name]));
  const providerName = new Map(facets.providers.map((p) => [p.slug, p.name]));
  const capName = new Map(facets.capabilities.map((c) => [c.key, c.name]));
  const chips: { key: string; label: string; value?: string }[] = [];
  for (const v of qs.list("lab")) chips.push({ key: "lab", value: v, label: `Lab: ${labName.get(v) ?? v}` });
  for (const v of qs.list("provider")) chips.push({ key: "provider", value: v, label: `Provider: ${providerName.get(v) ?? v}` });
  for (const v of qs.list("type")) chips.push({ key: "type", value: v, label: `Type: ${TYPE_LABEL[v.toUpperCase()] ?? v}` });
  for (const v of qs.list("cap")) chips.push({ key: "cap", value: v, label: capName.get(v) ?? v });
  for (const [k, l] of [["free", "Free"], ["open", "Open weights"], ["multimodal", "Multimodal"], ["deprecated", "Incl. deprecated"]]) if (qs.flag(k)) chips.push({ key: k, label: l });
  if (qs.get("minContext")) chips.push({ key: "minContext", label: `Context ≥ ${Number(qs.get("minContext")).toLocaleString()}` });
  if (qs.get("maxInput")) chips.push({ key: "maxInput", label: `Input ≤ $${qs.get("maxInput")}` });
  if (qs.get("maxOutput")) chips.push({ key: "maxOutput", label: `Output ≤ $${qs.get("maxOutput")}` });
  const searching = Boolean(qs.get("q"));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative basis-full sm:min-w-52 sm:flex-1 sm:basis-0">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q} onChange={(e) => setQ(e.target.value)} type="text" inputMode="search" enterKeyHint="search" autoComplete="off" spellCheck={false}
            aria-label="Search models" placeholder="Search by model, lab, provider or model ID"
            className="h-10 w-full rounded-lg border border-input bg-card pr-9 pl-10 text-sm shadow-xs transition-colors outline-none placeholder:text-muted-foreground hover:border-primary/30 focus-visible:border-primary/60 focus-visible:ring-[3px] focus-visible:ring-ring"
          />
          {q && (
            <button type="button" aria-label="Clear search" onClick={() => { setQ(""); qs.set({ q: null }); }} className="absolute top-1/2 right-2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none"><X className="size-3.5" /></button>
          )}
        </div>
        <Sheet open={sheet} onOpenChange={setSheet}>
          <SheetTrigger asChild><Button variant="outline" aria-label="Filters" className="h-10 rounded-lg lg:hidden"><SlidersHorizontal /> <span className="hidden min-[400px]:inline">Filters</span>{chips.length ? <span className="num rounded-full bg-primary/15 px-1.5 text-[11px] text-primary">{chips.length}</span> : null}</Button></SheetTrigger>
          <SheetContent side="left" className="w-[88%] max-w-sm gap-0 overflow-y-auto p-4">
            <SheetHeader className="p-0 pb-3"><SheetTitle>Filter models</SheetTitle><SheetDescription className="sr-only">Filter the model catalog</SheetDescription></SheetHeader>
            <FiltersSidebar facets={facets} />
            <div className="sticky bottom-0 -mx-4 mt-4 border-t bg-popover/95 p-4 backdrop-blur">
              <Button className="w-full" onClick={() => setSheet(false)}>Show {total.toLocaleString()} model{total === 1 ? "" : "s"}</Button>
            </div>
          </SheetContent>
        </Sheet>
        <MenuSelect label="Sort models" icon={ArrowUpDown} display={sortLabel} ariaValue={sortLabel} options={SORTS} value={sort} onSelect={(v) => { const [s, d] = v.split(":"); qs.set({ sort: s, dir: d }); }} className="min-w-0 flex-1 sm:max-w-52 sm:flex-none" />
        <MenuSelect label="Results per page" display={<>{pageSize}<span className="hidden sm:inline"> / page</span></>} ariaValue={`${pageSize} per page`} options={PAGE_SIZES.map((n) => [String(n), `${n} per page`])} value={pageSize} onSelect={(v) => qs.set({ pageSize: v })} />
        <div role="group" aria-label="View" className="relative flex h-10 items-center rounded-lg border border-input bg-card p-1">
          <span aria-hidden className={cn("absolute inset-y-1 left-1 w-8 rounded-md bg-accent shadow-xs transition-transform duration-200 ease-out", view === "grid" && "translate-x-8")} />
          {([["table", Rows3, "Table view"], ["grid", LayoutGrid, "Grid view"]] as const).map(([v, Icon, label]) => (
            <button key={v} type="button" aria-label={label} aria-pressed={view === v} onClick={() => qs.set({ view: v === defaultView ? null : v })}
              className={cn("relative z-10 flex size-8 items-center justify-center rounded-md outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring", view === v ? "text-foreground" : "text-muted-foreground hover:text-foreground")}><Icon className="size-4" /></button>
          ))}
        </div>
      </div>

      <div className="flex min-h-6 flex-wrap items-center gap-1.5 text-sm" aria-live="polite">
        <span className={cn("num mr-1 text-[13px] font-medium transition-opacity", qs.pending && "opacity-50")}>{total.toLocaleString()} model{total === 1 ? "" : "s"}</span>
        {chips.map((c) => (
          <button key={c.key + (c.value ?? "")} type="button" onClick={() => (c.value ? qs.toggle(c.key, c.value) : qs.set({ [c.key]: null }))} className={chipClass} aria-label={`Remove filter ${c.label}`}>
            {c.label} <X className="size-3.5 rounded text-muted-foreground transition-colors group-hover:text-foreground" />
          </button>
        ))}
        {searching && (
          <button type="button" onClick={() => { setQ(""); qs.set({ q: null }); }} className={chipClass} aria-label={`Remove search “${qs.get("q")}”`}>
            “{qs.get("q")}” <X className="size-3.5 rounded text-muted-foreground transition-colors group-hover:text-foreground" />
          </button>
        )}
        {(chips.length > 0 || searching) && (
          <button type="button" onClick={() => { setQ(""); qs.clear(["sort", "dir", "view", "pageSize"]); }} className="ml-1 rounded px-1 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none">Clear all</button>
        )}
      </div>
    </div>
  );
}
