import type { Metadata } from "next";
import { ExternalLink, MapPin } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ModelsGrid, ModelsTable } from "@/components/catalog/models-table";
import { CompactModelRow } from "@/components/catalog/model-parts";
import { EntityAvatar } from "@/components/shared/entity-avatar";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import { parseModelQuery } from "@/lib/validation/query";
import type { SP } from "@/lib/url";
import { getLab } from "@/services/directory";
import { listModels } from "@/services/models";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }>; searchParams: Promise<SP> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const r = await getLab((await params).slug, 1);
  return { title: r ? `${r.lab.name} models` : "Lab not found", description: r?.lab.description ?? undefined };
}

export default async function LabPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const profile = await getLab(slug, 1);
  if (!profile) notFound();
  const q = parseModelQuery({ ...sp, lab: slug });
  const models = await listModels({ ...q, lab: [slug] });
  const { lab, providers, recent } = profile;
  const dir = q.dir ?? (["input_price", "output_price", "name"].includes(q.sort) ? "asc" : "desc");
  return (
    <div className="container-page py-6">
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted-foreground"><Link href="/labs" className="hover:text-foreground">Labs</Link> / <span className="text-foreground">{lab.name}</span></nav>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <EntityAvatar name={lab.name} size={60} />
        <div className="min-w-0 flex-1">
          <PageHeader title={lab.name} description={lab.description ?? undefined} className="pb-2" />
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {lab.headquarters && <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" />{lab.headquarters}</span>}
            {lab.foundedYear && <span>Founded {lab.foundedYear}</span>}
          </div>
        </div>
        <div className="flex gap-2">
          {lab.websiteUrl && <Button variant="outline" asChild><a href={lab.websiteUrl} target="_blank" rel="noopener noreferrer">Website <ExternalLink /></a></Button>}
          {lab.docsUrl && <Button variant="outline" asChild><a href={lab.docsUrl} target="_blank" rel="noopener noreferrer">Docs <ExternalLink /></a></Button>}
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {([["Models", lab.modelCount], ["Open-weight", lab.openCount], ["Closed-weight", lab.closedCount], ["Providers serving", providers.length], ["Latest release", formatDate(lab.latestRelease)]] as const).map(([l, v]) => <Card key={l} className="gap-0 py-3"><div className="px-4 text-xs text-muted-foreground uppercase">{l}</div><div className="num px-4 text-lg font-semibold">{v}</div></Card>)}
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section className="min-w-0 space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">Models by {lab.name} <span className="num text-sm font-normal text-muted-foreground">({models.total})</span></h2>
          {sp.view === "grid" ? <ModelsGrid items={models.items} /> : <ModelsTable items={models.items} sp={sp} sort={q.sort} dir={dir} path={`/labs/${slug}`} />}
          <Pagination page={models.page} pageCount={models.pageCount} total={models.total} pageSize={models.pageSize} sp={sp} path={`/labs/${slug}`} />
        </section>
        <aside className="space-y-4">
          {recent.length > 0 && <Card className="gap-0 py-0"><CardHeader className="px-4 py-3"><CardTitle className="text-base">Latest releases</CardTitle></CardHeader><ul className="divide-y border-t">{recent.map((m) => <CompactModelRow key={m.id} m={m} right="released" />)}</ul></Card>}
          <Card className="gap-2"><CardHeader><CardTitle className="text-base">Available through</CardTitle></CardHeader>
            <CardContent><ul className="space-y-1.5 text-sm">{providers.map((p) => <li key={p.slug} className="flex items-center gap-2"><EntityAvatar name={p.name} size={20} /><Link href={`/providers/${p.slug}`} className="min-w-0 flex-1 truncate hover:text-primary hover:underline">{p.name}</Link><span className="num text-muted-foreground">{p.n}</span></li>)}</ul></CardContent></Card>
        </aside>
      </div>
    </div>
  );
}
