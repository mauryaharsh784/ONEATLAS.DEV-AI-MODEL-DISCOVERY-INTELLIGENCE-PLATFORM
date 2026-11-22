"use client";

import { Check as CheckIcon, ChevronDown, Search } from "lucide-react";
import { Collapsible } from "radix-ui";
import { useMemo, useState } from "react";

import { TYPE_LABEL } from "@/components/catalog/icons";
import { useQueryState } from "@/hooks/use-query-state";
import { cn } from "@/lib/utils";
import type { Facets } from "@/services/models";

/** Collapsible filter section. Starts open if it has a selection or `defaultOpen`; the header shows how many are selected. */
function Section({ title, selected = 0, defaultOpen = true, children }: { title: string; selected?: number; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen || selected > 0);
  return (
    <Collapsible.Root open={open} onOpenChange={setOpen} className="border-b border-border/70 py-1 first:pt-0 last:border-0">
      <Collapsible.Trigger className="group flex w-full items-center gap-2 rounded-md py-2 text-left text-[13px] font-medium outline-none focus-visible:ring-[3px] focus-visible:ring-ring">
        <span className="flex-1">{title}</span>
        {selected > 0 && <span className="num pop rounded-full bg-primary/15 px-1.5 text-[11px] leading-5 font-medium text-primary">{selected}</span>}
        <ChevronDown className="size-3.5 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
      </Collapsible.Trigger>
      <Collapsible.Content className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
        <div className="space-y-1.5 pt-0.5 pb-3">{children}</div>
      </Collapsible.Content>
    </Collapsible.Root>
  );
}

function Check({ checked, onChange, label, count }: { checked: boolean; onChange: () => void; label: string; count?: number }) {
  return (
    <label className="group flex cursor-pointer items-center gap-2.5 rounded-md px-1.5 py-1 text-[13px] transition-colors hover:bg-accent/50 has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring">
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
      <span aria-hidden className={cn("flex size-4 shrink-0 items-center justify-center rounded-[5px] border transition-colors duration-150", checked ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background/40 group-hover:border-primary/60")}>
        {checked && <CheckIcon className="pop size-3" strokeWidth={3} />}
      </span>
      <span className={cn("min-w-0 flex-1 truncate transition-colors", checked ? "text-foreground" : "text-foreground/80")} title={label}>{label}</span>
      {count !== undefined && <span className="num font-mono text-[11px] text-muted-foreground">{count}</span>}
    </label>
  );
}

function FacetSection({ title, options, selected, onToggle, searchable, initial = 7, defaultOpen }: { title: string; options: { value: string; label: string; count: number }[]; selected: string[]; onToggle: (v: string) => void; searchable?: boolean; initial?: number; defaultOpen?: boolean }) {
  const [all, setAll] = useState(false);
  const [filter, setFilter] = useState("");
  const shown = useMemo(() => {
    const f = options.filter((o) => o.label.toLowerCase().includes(filter.toLowerCase()));
    const pinned = options.filter((o) => selected.includes(o.value));
    return all || filter ? f : [...new Map([...pinned, ...f.slice(0, initial)].map((o) => [o.value, o])).values()];
  }, [options, selected, all, filter, initial]);
  return (
    <Section title={title} selected={selected.length} defaultOpen={defaultOpen}>
      {searchable && (
        <div className="relative mb-1">
          <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder={`Search ${title.toLowerCase()}`} aria-label={`Search ${title}`} className="h-8 w-full rounded-md border border-input bg-background/40 pr-2 pl-8 text-xs transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-primary/60 focus-visible:ring-[3px] focus-visible:ring-ring" />
        </div>
      )}
      <div className={cn("space-y-px", (all || filter) && "max-h-60 overflow-y-auto pr-1")}>
        {shown.map((o) => <Check key={o.value} checked={selected.includes(o.value)} onChange={() => onToggle(o.value)} label={o.label} count={o.count} />)}
        {!shown.length && <p className="px-1.5 py-1 text-xs text-muted-foreground">No matches for “{filter}”</p>}
      </div>
      {!filter && options.length > initial && (
        <button type="button" onClick={() => setAll((v) => !v)} className="rounded px-1.5 text-xs text-primary transition-colors hover:text-primary/80 focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none">
          {all ? "Show fewer" : `Show all ${options.length}`}
        </button>
      )}
    </Section>
  );
}

const CONTEXTS: [string, string][] = [["", "Any"], ["32000", "32K+"], ["128000", "128K+"], ["200000", "200K+"], ["1000000", "1M+"]];
const PRICES: [string, string][] = [["", "Any"], ["0.1", "$0.10"], ["0.5", "$0.50"], ["1", "$1"], ["3", "$3"], ["10", "$10"]];

/** Single-choice pills for numeric limits. "Any" removes the param. */
function Segmented({ label, hint, value, options, onChange }: { label: string; hint?: string; value: string; options: [string, string][]; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5 px-1.5">
      <p className="flex items-baseline justify-between text-xs text-muted-foreground"><span>{label}</span>{hint && <span className="text-[11px] opacity-70">{hint}</span>}</p>
      <div role="group" aria-label={label} className="flex flex-wrap gap-1">
        {options.map(([v, l]) => (
          <button
            key={v || "any"} type="button" aria-pressed={value === v} onClick={() => onChange(v)}
            className={cn("num h-7 rounded-md border px-2 text-xs transition-colors duration-150 outline-none focus-visible:ring-[3px] focus-visible:ring-ring", value === v ? "border-primary/50 bg-primary/15 text-foreground" : "border-transparent bg-secondary/60 text-muted-foreground hover:bg-accent hover:text-foreground")}
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}

const FILTER_KEYS = ["lab", "provider", "type", "cap", "open", "free", "multimodal", "deprecated", "minContext", "maxInput", "maxOutput"];

/** Advanced filter sidebar. Every control writes to the URL, so filters are shareable and server-rendered. */
export function FiltersSidebar({ facets, onNavigate }: { facets: Facets; onNavigate?: () => void }) {
  const qs = useQueryState();
  const toggle = (k: string) => (v: string) => { qs.toggle(k, v); onNavigate?.(); };
  const flag = (k: string) => () => qs.set({ [k]: qs.flag(k) ? null : "1" });
  const activeCount = FILTER_KEYS.filter((k) => qs.get(k)).reduce((n, k) => n + (qs.list(k).length > 1 && ["lab", "provider", "type", "cap"].includes(k) ? qs.list(k).length : 1), 0);
  const quickCount = ["free", "open", "multimodal", "deprecated"].filter((k) => qs.flag(k)).length;
  const limitCount = ["minContext", "maxInput", "maxOutput"].filter((k) => qs.get(k)).length;
  return (
    <div aria-busy={qs.pending} className={cn("text-sm transition-opacity duration-150", qs.pending && "opacity-60")}>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold">Filters {activeCount > 0 && <span className="num pop rounded-full bg-primary/15 px-1.5 text-[11px] leading-5 font-medium text-primary">{activeCount}</span>}</h2>
        <button type="button" disabled={!activeCount} onClick={() => qs.clear(["q", "sort", "dir", "view", "pageSize"])} className="rounded px-1 text-xs text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40">Clear filters</button>
      </div>
      <Section title="Quick filters" selected={quickCount}>
        <Check checked={qs.flag("free")} onChange={flag("free")} label="Free models" />
        <Check checked={qs.flag("open")} onChange={flag("open")} label="Open weights" />
        <Check checked={qs.flag("multimodal")} onChange={flag("multimodal")} label="Multimodal input" />
        <Check checked={qs.flag("deprecated")} onChange={flag("deprecated")} label="Include deprecated" />
      </Section>
      <FacetSection title="Capabilities" options={facets.capabilities.map((c) => ({ value: c.key, label: c.name, count: c.count }))} selected={qs.list("cap")} onToggle={toggle("cap")} initial={6} />
      <FacetSection title="Model types" options={facets.types.map((t) => ({ value: t.value.toLowerCase(), label: TYPE_LABEL[t.value] ?? t.value, count: t.count }))} selected={qs.list("type")} onToggle={toggle("type")} initial={8} />
      <FacetSection title="Providers" options={facets.providers.map((p) => ({ value: p.slug, label: p.name, count: p.count }))} selected={qs.list("provider")} onToggle={toggle("provider")} searchable initial={6} defaultOpen={false} />
      <FacetSection title="Labs" options={facets.labs.map((l) => ({ value: l.slug, label: l.name, count: l.count }))} selected={qs.list("lab")} onToggle={toggle("lab")} searchable initial={6} defaultOpen={false} />
      <Section title="Context & pricing" selected={limitCount}>
        <div className="space-y-3.5">
          <Segmented label="Context length" hint="min tokens" value={qs.get("minContext")} options={CONTEXTS} onChange={(v) => qs.set({ minContext: v })} />
          <Segmented label="Input price" hint="max $ / 1M" value={qs.get("maxInput")} options={PRICES} onChange={(v) => qs.set({ maxInput: v })} />
          <Segmented label="Output price" hint="max $ / 1M" value={qs.get("maxOutput")} options={PRICES} onChange={(v) => qs.set({ maxOutput: v })} />
        </div>
      </Section>
    </div>
  );
}
