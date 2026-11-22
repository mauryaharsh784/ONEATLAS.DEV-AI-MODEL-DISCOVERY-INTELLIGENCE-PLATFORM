import Link from "next/link";

import { EntityAvatar } from "@/components/shared/entity-avatar";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatPricePerMTok, formatTokens } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ModelRow } from "@/types/catalog";
import { TYPE_LABEL } from "./icons";

export function isNew(releaseDate: string | null, days = 30): boolean {
  if (!releaseDate) return false;
  const age = (Date.now() - new Date(releaseDate).getTime()) / 86_400_000;
  return age >= 0 && age <= days;
}

export function ModelName({ m, size = 28 }: { m: Pick<ModelRow, "canonicalId" | "name" | "lab" | "status" | "releaseDate" | "type">; size?: number }) {
  const id = m.canonicalId.split("/")[1] ?? m.canonicalId;
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <EntityAvatar name={m.lab.name} size={size} />
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <Link href={`/models/${m.canonicalId}`} title={m.name} className="truncate font-medium tracking-tight transition-colors hover:text-primary focus-visible:text-primary focus-visible:outline-none">{m.name}</Link>
          {isNew(m.releaseDate) && <Badge variant="info" className="px-1.5 py-0 text-[10px]">New</Badge>}
          {m.status === "DEPRECATED" && <Badge variant="warning" className="px-1.5 py-0 text-[10px]">Deprecated</Badge>}
        </div>
        <div className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
          <span className="shrink-0">{m.lab.name}</span>
          <span aria-hidden className="size-0.5 shrink-0 rounded-full bg-muted-foreground/50" />
          <span className="truncate font-mono text-[11px]" title={m.canonicalId}>{id}</span>
          {m.type !== "TEXT" && <span className="shrink-0 rounded bg-secondary px-1 text-[10px]">{TYPE_LABEL[m.type] ?? m.type}</span>}
        </div>
      </div>
    </div>
  );
}

/** Price per 1M tokens in mono, with the currency sign dimmed so the digits carry the column. */
export function PriceText({ value, free, className }: { value: number | null; free?: boolean; className?: string }) {
  if (free && (value === 0 || value === null)) return <Badge variant="success" className="px-1.5 py-0 text-[10px]">Free</Badge>;
  const text = formatPricePerMTok(value);
  if (!text.startsWith("$")) return <span className={cn("num", text === "—" && "text-muted-foreground", className)}>{text}</span>;
  return <span className={cn("num font-mono text-[13px]", className)}><span className="text-muted-foreground">$</span>{text.slice(1)}</span>;
}

/** Context window as a number plus a log-scaled bar (4K → 2M), so long-context models stand out at a glance. */
export function ContextMeter({ value, className }: { value: number | null; className?: string }) {
  if (!value) return <span className="num text-muted-foreground">—</span>;
  const pct = Math.max(4, Math.min(100, (Math.log(value / 4_000) / Math.log(2_000_000 / 4_000)) * 100));
  return (
    <div className={cn("ml-auto flex w-20 flex-col items-end gap-1", className)}>
      <span className="num font-mono text-[13px]">{formatTokens(value)}</span>
      <span aria-hidden className="h-0.5 w-full overflow-hidden rounded-full bg-muted">
        <span className="block h-full rounded-full bg-linear-to-r from-primary/60 to-primary" style={{ width: `${pct}%` }} />
      </span>
    </div>
  );
}

export function ProviderStack({ providers, count }: { providers: { slug: string; name: string }[]; count: number }) {
  if (!count) return <span className="text-muted-foreground">—</span>;
  const extra = count - Math.min(3, providers.length);
  return (
    <div className="flex items-center" title={`${count} provider${count === 1 ? "" : "s"}`}>
      <div className="flex -space-x-1.5">
        {providers.slice(0, 3).map((p) => (
          <Link key={p.slug} href={`/providers/${p.slug}`} title={p.name} className="rounded-md ring-2 ring-card transition-transform hover:z-10 hover:-translate-y-0.5"><EntityAvatar name={p.name} size={22} /></Link>
        ))}
      </div>
      {extra > 0 && <span className="num ml-1.5 text-xs text-muted-foreground">+{extra}</span>}
    </div>
  );
}

export function WeightsBadge({ open }: { open: boolean }) {
  return <Badge variant={open ? "success" : "secondary"} className="px-1.5 py-0 text-[10px]">{open ? "Open" : "Closed"}</Badge>;
}

export function TypeBadge({ type }: { type: string }) {
  return <Badge variant="outline" className="px-1.5 py-0 text-[10px]">{TYPE_LABEL[type] ?? type}</Badge>;
}

/** Compact one-line row used in dashboard lists. `right` selects what the right-hand column shows. */
export function CompactModelRow({ m, right, className }: { m: ModelRow; right: "released" | "price" | "providers" | "context"; className?: string }) {
  const meta = {
    released: formatDate(m.releaseDate),
    price: m.inputPrice === null ? "—" : `${formatPricePerMTok(m.inputPrice)} / ${formatPricePerMTok(m.outputPrice)}`,
    providers: `${m.providerCount} providers`,
    context: formatTokens(m.contextWindow),
  }[right];
  return (
    <li className={`flex items-center gap-3 px-4 py-2.5 ${className ?? ""}`}>
      <ModelName m={m} size={30} />
      <span className="num ml-auto shrink-0 text-xs text-muted-foreground">{meta}</span>
    </li>
  );
}
