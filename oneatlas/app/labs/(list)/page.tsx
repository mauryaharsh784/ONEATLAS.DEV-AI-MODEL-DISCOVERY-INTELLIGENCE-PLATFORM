import type { Metadata } from "next";
import { SearchX } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { DirectoryFilter } from "@/components/shared/directory-filter";
import { EntityAvatar } from "@/components/shared/entity-avatar";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import { parseListQuery } from "@/lib/validation/query";
import type { SP } from "@/lib/url";
import { listLabs } from "@/services/directory";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "AI labs", description: "Directory of AI labs with model counts, open vs closed weights and latest releases." };

export default async function LabsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const q = parseListQuery(await searchParams);
  const labs = await listLabs({ q: q.q, sort: q.sort });
  return (
    <div className="container-page py-6">
      <PageHeader title="AI labs" description={`${labs.length} labs that build the models in the catalog. Open / closed counts exclude deprecated models.`} className="pb-4" />
      <div className="mb-5"><DirectoryFilter action="/labs" q={q.q} sort={q.sort} placeholder="Search labs" sorts={[["models", "Most models"], ["open", "Most open-weight"], ["latest", "Latest release"], ["name", "Name A–Z"]]} /></div>
      {labs.length === 0 ? <EmptyState icon={SearchX} title="No labs match" description="Try a different search term." /> : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {labs.map((l) => (
            <Link key={l.slug} href={`/labs/${l.slug}`} className="group rounded-xl outline-none focus-visible:ring-[3px] focus-visible:ring-ring">
              <Card className="h-full gap-3 transition-colors group-hover:border-primary/40 group-hover:bg-accent/30">
                <div className="flex items-center gap-3 px-5"><EntityAvatar name={l.name} size={40} /><div className="min-w-0"><h2 className="truncate font-semibold">{l.name}</h2><p className="truncate text-xs text-muted-foreground">{[l.headquarters, l.foundedYear && `Founded ${l.foundedYear}`].filter(Boolean).join(" · ") || "AI lab"}</p></div></div>
                <p className="line-clamp-2 px-5 text-sm text-muted-foreground">{l.description}</p>
                <dl className="num mt-auto grid grid-cols-3 gap-2 border-t px-5 pt-3 text-sm">
                  <div><dt className="text-[11px] text-muted-foreground uppercase">Models</dt><dd className="font-semibold">{l.modelCount}</dd></div>
                  <div><dt className="text-[11px] text-muted-foreground uppercase">Open / closed</dt><dd>{l.openCount} / {l.closedCount}</dd></div>
                  <div><dt className="text-[11px] text-muted-foreground uppercase">Latest</dt><dd className="text-xs">{formatDate(l.latestRelease)}</dd></div>
                </dl>
              </Card>
            </Link>
          ))}
        </div>
      )}
      <p className="mt-4 text-xs text-muted-foreground"><Badge variant="outline" className="mr-1">Note</Badge>Lab profiles are hand-curated; logos are generated initials. Latest release shows only models with a known release date.</p>
    </div>
  );
}
