import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { buildHref, type SP } from "@/lib/url";
import { cn } from "@/lib/utils";

function windowed(page: number, count: number): (number | "…")[] {
  const set = new Set([1, count, page - 1, page, page + 1].filter((n) => n >= 1 && n <= count));
  const sorted = [...set].sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  sorted.forEach((n, i) => { if (i && n - sorted[i - 1] > 1) out.push("…"); out.push(n); });
  return out;
}

export function Pagination({ page, pageCount, total, pageSize, sp, path }: { page: number; pageCount: number; total: number; pageSize: number; sp: SP; path: string }) {
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1, to = Math.min(total, page * pageSize);
  const item = "inline-flex h-8 min-w-8 items-center justify-center rounded-md border bg-card px-2 text-sm transition-colors hover:bg-accent";
  return (
    <nav aria-label="Pagination" className="flex flex-col items-center justify-between gap-3 py-4 sm:flex-row">
      <p className="num text-sm text-muted-foreground">Showing {from.toLocaleString()}–{to.toLocaleString()} of {total.toLocaleString()}</p>
      <ul className="flex items-center gap-1">
        <li><Link aria-label="Previous page" aria-disabled={page <= 1} href={buildHref(path, sp, { page: String(Math.max(1, page - 1)) })} className={cn(item, page <= 1 && "pointer-events-none opacity-40")}><ChevronLeft className="size-4" /></Link></li>
        {windowed(page, pageCount).map((n, i) => (
          <li key={i}>{n === "…" ? <span className="px-1 text-muted-foreground">…</span>
            : <Link href={buildHref(path, sp, { page: String(n) })} aria-current={n === page ? "page" : undefined} className={cn(item, n === page && "border-primary bg-primary text-primary-foreground hover:bg-primary")}>{n}</Link>}</li>
        ))}
        <li><Link aria-label="Next page" aria-disabled={page >= pageCount} href={buildHref(path, sp, { page: String(Math.min(pageCount, page + 1)) })} className={cn(item, page >= pageCount && "pointer-events-none opacity-40")}><ChevronRight className="size-4" /></Link></li>
      </ul>
    </nav>
  );
}
