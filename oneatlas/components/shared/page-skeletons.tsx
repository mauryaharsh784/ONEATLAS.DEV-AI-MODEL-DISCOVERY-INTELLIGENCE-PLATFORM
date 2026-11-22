import { Skeleton } from "@/components/ui/skeleton";

/** Loading skeletons shown while a page's database queries run. Kept out of detail routes so notFound() can still return 404. */
function Header() {
  return <div className="space-y-3 pb-6"><Skeleton className="h-8 w-56" /><Skeleton className="h-4 w-96 max-w-full" /></div>;
}

export function TableSkeleton({ rows = 10, sidebar = false }: { rows?: number; sidebar?: boolean }) {
  return (
    <div className="container-page py-6" role="status" aria-label="Loading">
      <Header />
      <div className={sidebar ? "grid gap-6 lg:grid-cols-[250px_1fr]" : ""}>
        {sidebar && <div className="hidden space-y-3 lg:block">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-8" />)}</div>}
        <div className="space-y-3"><Skeleton className="h-9" />
          <div className="overflow-hidden rounded-xl border">{Array.from({ length: rows }).map((_, i) => <Skeleton key={i} className="h-12 rounded-none border-b" />)}</div></div>
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="container-page space-y-5 py-6" role="status" aria-label="Loading">
      <div className="space-y-3"><Skeleton className="h-9 w-72" /><Skeleton className="h-12 w-full max-w-xl" /></div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      <div className="grid gap-5 lg:grid-cols-12"><div className="space-y-5 lg:col-span-8"><Skeleton className="h-64 rounded-xl" /><Skeleton className="h-64 rounded-xl" /></div><div className="space-y-5 lg:col-span-4"><Skeleton className="h-48 rounded-xl" /><Skeleton className="h-48 rounded-xl" /></div></div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}

export function CardsSkeleton() {
  return (
    <div className="container-page py-6" role="status" aria-label="Loading">
      <Header />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-xl" />)}</div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}

/** Skeleton shaped like the model catalog: header band, controls, filter column and table rows. */
export function CatalogSkeleton({ rows = 12 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading models">
      <div className="border-b">
        <div className="container-page flex flex-col gap-6 py-8 sm:py-10 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3"><Skeleton className="h-10 w-72 max-w-full" /><Skeleton className="h-4 w-[28rem] max-w-full" /></div>
          <Skeleton className="h-[72px] w-72 rounded-xl" />
        </div>
      </div>
      <div className="container-page grid gap-8 py-6 lg:grid-cols-[256px_minmax(0,1fr)]">
        <div className="hidden space-y-3 lg:block">{Array.from({ length: 9 }).map((_, i) => <Skeleton key={i} className="h-7" style={{ width: `${88 - (i % 3) * 14}%` }} />)}</div>
        <div className="space-y-4">
          <div className="flex gap-2"><Skeleton className="h-10 flex-1 rounded-lg" /><Skeleton className="h-10 w-40 rounded-lg" /><Skeleton className="h-10 w-28 rounded-lg" /><Skeleton className="h-10 w-20 rounded-lg" /></div>
          <div className="overflow-hidden rounded-xl border bg-card">
            <Skeleton className="h-10 rounded-none" />
            {Array.from({ length: rows }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 border-t border-border/60 px-4 py-3">
                <Skeleton className="size-4 rounded" /><Skeleton className="size-7" />
                <div className="flex-1 space-y-1.5"><Skeleton className="h-3.5 w-40" /><Skeleton className="h-3 w-28" /></div>
                <Skeleton className="hidden h-4 w-14 sm:block" /><Skeleton className="hidden h-4 w-12 md:block" /><Skeleton className="hidden h-4 w-12 md:block" />
              </div>
            ))}
          </div>
        </div>
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
