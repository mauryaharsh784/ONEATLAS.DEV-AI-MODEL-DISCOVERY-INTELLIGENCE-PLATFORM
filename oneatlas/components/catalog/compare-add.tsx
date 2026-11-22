"use client";

import { Link2, Loader2, Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { EntityAvatar } from "@/components/shared/entity-avatar";
import { Button } from "@/components/ui/button";
import type { ModelRow } from "@/types/catalog";

/** Search the catalog and add a model to the comparison (the URL is the state). */
export function CompareAdd({ ids }: { ids: string[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<ModelRow[]>([]);
  const [loading, setLoading] = useState(false);
  const full = ids.length >= 5;
  const shown = q.trim() ? results : [];

  useEffect(() => {
    const term = q.trim();
    if (!term) return;
    const ctl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(term)}&limit=8`, { signal: ctl.signal });
        if (!r.ok) throw new Error();
        setResults((await r.json()).data.models);
      } catch (e) { if ((e as Error).name !== "AbortError") toast.error("Search failed. Try again."); }
      finally { setLoading(false); }
    }, 200);
    return () => { clearTimeout(t); ctl.abort(); };
  }, [q]);

  function add(id: string) {
    if (ids.includes(id)) return toast.info("Already in the comparison");
    if (full) return toast.error("You can compare up to 5 models.");
    router.push(`/compare?${new URLSearchParams({ ids: [...ids, id].join(",") })}`);
    setQ("");
  }

  return (
    <div className="relative max-w-md flex-1">
      <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <input value={q} onChange={(e) => setQ(e.target.value)} disabled={full} aria-label="Search models to add" placeholder={full ? "Maximum of 5 models reached" : "Search a model to add…"}
        className="h-9 w-full rounded-md border border-input bg-card pr-9 pl-9 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring disabled:opacity-50" />
      {loading && <Loader2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
      {q.trim() && !loading && shown.length === 0 && <p className="absolute z-20 mt-1 w-full rounded-lg border bg-popover p-3 text-sm text-muted-foreground shadow-lg">No models found.</p>}
      {shown.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-80 w-full overflow-y-auto rounded-lg border bg-popover py-1 shadow-lg">
          {shown.map((m) => (
            <li key={m.id}>
              <button type="button" onClick={() => add(m.canonicalId)} disabled={ids.includes(m.canonicalId)} className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-accent disabled:opacity-50">
                <EntityAvatar name={m.lab.name} size={24} /><span className="min-w-0 flex-1"><span className="block truncate font-medium">{m.name}</span><span className="block truncate text-xs text-muted-foreground">{m.canonicalId}</span></span><Plus className="size-4 text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function CopyLinkButton() {
  return (
    <Button type="button" variant="outline" onClick={async () => {
      try { await navigator.clipboard.writeText(window.location.href); toast.success("Comparison link copied"); } catch { toast.error("Couldn't copy the link."); }
    }}><Link2 /> Copy share link</Button>
  );
}
