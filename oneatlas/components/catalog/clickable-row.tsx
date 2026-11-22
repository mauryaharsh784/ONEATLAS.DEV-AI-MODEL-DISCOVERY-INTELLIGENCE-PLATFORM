"use client";

import { useRouter } from "next/navigation";

import { useCompare } from "@/components/catalog/compare-provider";
import { cn } from "@/lib/utils";

/** Table row that opens the model page on click, unless the click landed on a link, button or checkbox inside it. */
export function ClickableRow({ href, compareId, className, children }: { href: string; compareId: string; className?: string; children: React.ReactNode }) {
  const router = useRouter();
  const { has } = useCompare();
  const selected = has(compareId);
  return (
    <tr
      data-state={selected ? "selected" : undefined}
      onClick={(e) => { if (!(e.target as HTMLElement).closest("a,button,[role=checkbox]")) router.push(href); }}
      onMouseEnter={() => router.prefetch(href)}
      className={cn(
        "group/row cursor-pointer border-b border-border/60 transition-colors duration-100 last:border-0 hover:bg-accent/40",
        "data-[state=selected]:bg-primary/[0.06] data-[state=selected]:shadow-[inset_2px_0_0_0_var(--primary)]",
        className,
      )}
    >
      {children}
    </tr>
  );
}
