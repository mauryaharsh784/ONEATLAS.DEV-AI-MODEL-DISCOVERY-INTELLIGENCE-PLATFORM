import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Plain GET form (works without JS) used by the labs / providers directories. */
export function DirectoryFilter({ action, q, sort, sorts, type, types, placeholder }: {
  action: string; q?: string; sort?: string; sorts?: [string, string][]; type?: string; types?: [string, string][]; placeholder: string;
}) {
  const sel = "h-9 rounded-md border bg-card px-2 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring";
  return (
    <form action={action} method="get" role="search" className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-56 flex-1">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <input name="q" defaultValue={q} placeholder={placeholder} aria-label={placeholder} className="h-9 w-full rounded-md border border-input bg-card pr-3 pl-9 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring" />
      </div>
      {types && <select name="type" defaultValue={type ?? ""} aria-label="Provider type" className={sel}><option value="">All types</option>{types.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>}
      {sorts && <select name="sort" defaultValue={sort ?? sorts[0][0]} aria-label="Sort" className={sel}>{sorts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>}
      <Button type="submit">Apply</Button>
    </form>
  );
}
