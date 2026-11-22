import { ArrowDown, ArrowRight, ArrowUp, ArrowUpDown, Layers } from "lucide-react";
import Link from "next/link";

import { ClickableRow } from "@/components/catalog/clickable-row";
import { CompareButton, CompareCheck } from "@/components/catalog/compare-controls";
import { CapabilityIcons, ModalityIcons } from "@/components/catalog/icons";
import { ContextMeter, ModelName, PriceText, ProviderStack, WeightsBadge, TypeBadge, isNew } from "@/components/catalog/model-parts";
import { EntityAvatar } from "@/components/shared/entity-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatTokens } from "@/lib/format";
import { buildHref, type SP } from "@/lib/url";
import { cn } from "@/lib/utils";
import type { ModelRow } from "@/types/catalog";

const TH = "h-10 whitespace-nowrap px-3 text-left align-middle text-xs font-medium text-muted-foreground";

function SortHead({ label, k, sort, dir, sp, path, defaultDir, className }: { label: string; k: string; sort: string; dir: string; sp: SP; path: string; defaultDir: "asc" | "desc"; className?: string }) {
  const active = sort === k;
  const nextDir = active ? (dir === "asc" ? "desc" : "asc") : defaultDir;
  const Icon = !active ? ArrowUpDown : dir === "asc" ? ArrowUp : ArrowDown;
  const right = className?.includes("text-right");
  return (
    <th scope="col" className={cn(TH, className)} aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}>
      <Link
        href={buildHref(path, sp, { sort: k, dir: nextDir })}
        className={cn("group/sort inline-flex items-center gap-1 rounded transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none", right && "flex-row-reverse", active && "text-foreground")}
      >
        {label} <Icon className={cn("size-3 transition-opacity", active ? "text-primary opacity-100" : "opacity-40 group-hover/sort:opacity-80")} />
      </Link>
    </th>
  );
}

/**
 * Server-rendered catalog table. Column headers are links, so sorting is just a URL change.
 * The wrapper is its own scroll container (both axes) so the header can stay pinned while rows scroll.
 */
export function ModelsTable({ items, sp, sort, dir, path = "/models" }: { items: ModelRow[]; sp: SP; sort: string; dir: string; path?: string }) {
  const sh = { sort, dir, sp, path };
  return (
    <>
      {/* ≥ md: dense table */}
      <div className="edge-highlight hidden overflow-hidden rounded-xl border bg-card md:block">
        <div className="max-h-[calc(100dvh-var(--header-height)-7rem)] overflow-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="sticky top-0 z-10 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
              <tr>
                <th scope="col" className={cn(TH, "w-10 pr-0 pl-4")}><span className="sr-only">Compare</span></th>
                <SortHead label="Model" k="name" defaultDir="asc" {...sh} />
                <th scope="col" className={TH}>Providers</th>
                <SortHead label="Context" k="context" defaultDir="desc" className="text-right" {...sh} />
                <SortHead label="Input /1M" k="input_price" defaultDir="asc" className="text-right" {...sh} />
                <SortHead label="Output /1M" k="output_price" defaultDir="asc" className="text-right" {...sh} />
                <th scope="col" className={TH}>Capabilities</th>
                <th scope="col" className={cn(TH, "hidden 2xl:table-cell")}>Input</th>
                <th scope="col" className={TH}>Weights</th>
                <SortHead label="Released" k="released" defaultDir="desc" className="hidden xl:table-cell" {...sh} />
              </tr>
            </thead>
            <tbody>
              {items.map((m) => (
                <ClickableRow key={m.id} href={`/models/${m.canonicalId}`} compareId={m.canonicalId}>
                  <td className="w-10 py-2.5 pr-0 pl-4"><CompareCheck id={m.canonicalId} name={m.name} /></td>
                  <td className="max-w-80 min-w-56 px-3 py-2.5"><ModelName m={m} /></td>
                  <td className="px-3 py-2.5"><ProviderStack providers={m.providers} count={m.providerCount} /></td>
                  <td className="px-3 py-2.5 text-right"><ContextMeter value={m.contextWindow} /></td>
                  <td className="px-3 py-2.5 text-right"><PriceText value={m.inputPrice} free={m.isFree} /></td>
                  <td className="px-3 py-2.5 text-right"><PriceText value={m.outputPrice} free={m.isFree} /></td>
                  <td className="px-3 py-2.5"><CapabilityIcons caps={m.capabilities} /></td>
                  <td className="hidden px-3 py-2.5 2xl:table-cell"><ModalityIcons modalities={m.inputModalities} /></td>
                  <td className="px-3 py-2.5"><WeightsBadge open={m.openWeights} /></td>
                  <td className="num hidden px-3 py-2.5 text-[13px] whitespace-nowrap text-muted-foreground xl:table-cell">{formatDate(m.releaseDate)}</td>
                </ClickableRow>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* < md: compact list instead of a cramped scrolling table */}
      <ul className="edge-highlight divide-y divide-border/60 overflow-hidden rounded-xl border bg-card md:hidden">
        {items.map((m) => (
          <li key={m.id} className="flex items-start gap-3 px-3 py-3">
            <CompareCheck id={m.canonicalId} name={m.name} className="mt-1.5" />
            <div className="min-w-0 flex-1 space-y-2">
              <ModelName m={m} />
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
                <span className="num font-mono">{formatTokens(m.contextWindow)} ctx</span>
                <span className="inline-flex items-center gap-1"><PriceText value={m.inputPrice} free={m.isFree} className="text-foreground" /> in <span aria-hidden>/</span> <PriceText value={m.outputPrice} free={m.isFree} className="text-foreground" /> out</span>
                <WeightsBadge open={m.openWeights} />
              </div>
              <CapabilityIcons caps={m.capabilities} />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

export function ModelsGrid({ items }: { items: ModelRow[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
      {items.map((m) => (
        <article key={m.id} className="edge-highlight group flex flex-col gap-3.5 rounded-xl border bg-card p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-xl hover:shadow-black/20 motion-reduce:transform-none">
          <header className="flex items-start gap-3">
            <EntityAvatar name={m.lab.name} size={36} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <Link href={`/models/${m.canonicalId}`} title={m.name} className="truncate font-medium tracking-tight hover:text-primary focus-visible:text-primary focus-visible:outline-none">{m.name}</Link>
                {isNew(m.releaseDate) && <Badge variant="info" className="px-1.5 py-0 text-[10px]">New</Badge>}
                {m.status === "DEPRECATED" && <Badge variant="warning" className="px-1.5 py-0 text-[10px]">Deprecated</Badge>}
              </div>
              <p className="truncate text-xs text-muted-foreground">{m.lab.name} <span aria-hidden>·</span> <span className="font-mono text-[11px]" title={m.canonicalId}>{m.canonicalId.split("/")[1]}</span></p>
            </div>
            <CompareCheck id={m.canonicalId} name={m.name} className="mt-1" />
          </header>

          <p className="line-clamp-2 min-h-[2.5rem] text-[13px] leading-5 text-muted-foreground">{m.description ?? "No description available."}</p>

          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className="gap-1 px-1.5 py-0.5 text-[11px] font-normal"><Layers /> <span className="num font-mono">{formatTokens(m.contextWindow)}</span> context</Badge>
            {m.type !== "TEXT" && <TypeBadge type={m.type} />}
            <WeightsBadge open={m.openWeights} />
          </div>

          <dl className="grid grid-cols-2 divide-x rounded-lg border bg-background/40 text-sm">
            <div className="px-3 py-2"><dt className="text-[11px] text-muted-foreground">Input / 1M tokens</dt><dd className="mt-0.5"><PriceText value={m.inputPrice} free={m.isFree} /></dd></div>
            <div className="px-3 py-2"><dt className="text-[11px] text-muted-foreground">Output / 1M tokens</dt><dd className="mt-0.5"><PriceText value={m.outputPrice} free={m.isFree} /></dd></div>
          </dl>

          <div className="flex items-center justify-between gap-2">
            <CapabilityIcons caps={m.capabilities} />
            <div className="flex items-center gap-2"><ModalityIcons modalities={m.inputModalities} /><ProviderStack providers={m.providers} count={m.providerCount} /></div>
          </div>

          <footer className="mt-auto flex items-center justify-between gap-2 border-t pt-3">
            <CompareButton id={m.canonicalId} name={m.name} />
            <Button size="sm" variant="ghost" asChild className="group/details"><Link href={`/models/${m.canonicalId}`}>View details <ArrowRight className="transition-transform duration-150 group-hover/details:translate-x-0.5" /></Link></Button>
          </footer>
        </article>
      ))}
    </div>
  );
}
