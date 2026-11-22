"use client";

import { ArrowRight, Check, GitCompareArrows, Plus, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { MAX_COMPARE, useCompare } from "@/components/catalog/compare-provider";
import { EntityAvatar } from "@/components/shared/entity-avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Checkbox-style toggle used in table rows and cards. The hit area is padded out to a comfortable touch target. */
export function CompareCheck({ id, name, className }: { id: string; name: string; className?: string }) {
  const { has, toggle } = useCompare();
  const on = has(id);
  return (
    <button
      type="button" role="checkbox" aria-checked={on} aria-label={`${on ? "Remove" : "Add"} ${name} ${on ? "from" : "to"} comparison`}
      onClick={() => toggle({ id, name })}
      className={cn(
        "relative flex size-[18px] items-center justify-center rounded-[5px] border outline-none transition-colors duration-150 after:absolute after:-inset-3 after:content-[''] focus-visible:ring-[3px] focus-visible:ring-ring",
        on ? "pop border-primary bg-primary text-primary-foreground" : "border-input bg-background/40 hover:border-primary/70 hover:bg-primary/10",
        className,
      )}
    >
      {on && <Check className="size-3" strokeWidth={3} />}
    </button>
  );
}

export function CompareButton({ id, name, size = "sm" }: { id: string; name: string; size?: "sm" | "default" }) {
  const { has, toggle } = useCompare();
  const on = has(id);
  return (
    <Button type="button" size={size} variant={on ? "secondary" : "outline"} aria-pressed={on} onClick={() => toggle({ id, name })} className={cn(on && "border-primary/40 text-foreground")}>
      {on ? <Check className="pop text-primary" /> : <Plus />} {on ? "Added to compare" : "Add to compare"}
    </Button>
  );
}

/** Floating bar listing the selected models with a link to /compare. Slides up when the first model is selected. */
export function CompareTray() {
  const { items, remove, clear, href } = useCompare();
  const pathname = usePathname();
  if (!items.length || pathname.startsWith("/compare")) return null; // the compare page already shows the selection
  const ready = items.length >= 2;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-4">
      <section aria-label="Model comparison" className="tray-in pointer-events-auto flex max-w-full items-center gap-2 rounded-2xl border border-white/10 bg-popover/90 p-2 pl-3 shadow-2xl shadow-black/40 backdrop-blur-xl sm:gap-3">
        <div className="flex shrink-0 items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary/15 text-primary"><GitCompareArrows className="size-4" /></span>
          <div className="hidden leading-tight sm:block">
            <p className="text-sm font-medium"><span key={items.length} className="pop inline-block num">{items.length}</span> selected</p>
            <p className="text-[11px] text-muted-foreground">{ready ? `Up to ${MAX_COMPARE} models` : "Add one more to compare"}</p>
          </div>
        </div>
        <ul className="flex min-w-0 items-center gap-1.5 overflow-x-auto py-0.5">
          {items.map((i) => (
            <li key={i.id} className="tray-in flex shrink-0 items-center gap-1.5 rounded-lg border bg-secondary/70 py-1 pr-1 pl-1.5 text-xs">
              <EntityAvatar name={i.name} size={18} />
              <span className="max-w-32 truncate" title={i.name}>{i.name}</span>
              <button type="button" onClick={() => remove(i.id)} aria-label={`Remove ${i.name}`} className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-background hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none"><X className="size-3" /></button>
            </li>
          ))}
        </ul>
        <div className="flex shrink-0 items-center gap-1">
          <Button size="sm" variant="ghost" onClick={clear} className="text-muted-foreground">Clear</Button>
          <Button size="sm" asChild disabled={!ready}>
            <Link href={href} aria-disabled={!ready} tabIndex={ready ? undefined : -1} className={cn("group", !ready && "pointer-events-none opacity-50")}>
              Compare now <ArrowRight className="transition-transform duration-150 group-hover:translate-x-0.5" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
