import type { Metadata } from "next";
import { ExternalLink, SearchX } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PROVIDER_TYPE_LABEL, TYPE_LABEL } from "@/components/catalog/icons";
import { PriceText } from "@/components/catalog/model-parts";
import { CopyButton } from "@/components/shared/copy-button";
import { DirectoryFilter } from "@/components/shared/directory-filter";
import { EmptyState } from "@/components/shared/empty-state";
import { EntityAvatar } from "@/components/shared/entity-avatar";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatPricePerMTok, formatTokens } from "@/lib/format";
import { parseListQuery } from "@/lib/validation/query";
import type { SP } from "@/lib/url";
import { getProvider } from "@/services/directory";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }>; searchParams: Promise<SP> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const r = await getProvider((await params).slug, { page: 1, pageSize: 1 });
  return { title: r ? `${r.provider.name} — models & pricing` : "Provider not found" };
}

export default async function ProviderPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const q = parseListQuery(sp);
  const r = await getProvider(slug, { q: q.q, page: q.page, pageSize: 25 });
  if (!r) notFound();
  const { provider: p, listings, labs } = r;
  return (
    <div className="container-page py-6">
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted-foreground"><Link href="/providers" className="hover:text-foreground">Providers</Link> / <span className="text-foreground">{p.name}</span></nav>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <EntityAvatar name={p.name} size={60} />
        <div className="min-w-0 flex-1"><PageHeader title={p.name} description={p.description ?? undefined} eyebrow={<Badge variant="outline">{PROVIDER_TYPE_LABEL[p.type]}</Badge>} className="pb-0" /></div>
        <div className="flex gap-2">
          {p.websiteUrl && <Button variant="outline" asChild><a href={p.websiteUrl} target="_blank" rel="noopener noreferrer">Website <ExternalLink /></a></Button>}
          {p.docsUrl && <Button variant="outline" asChild><a href={p.docsUrl} target="_blank" rel="noopener noreferrer">API docs <ExternalLink /></a></Button>}
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {([["Models", p.modelCount], ["Listings", p.listingCount], ["Labs served", labs.length], ["Lowest input $/1M", p.minInputPrice === null ? "—" : formatPricePerMTok(p.minInputPrice)]] as const).map(([l, v]) => <Card key={l} className="gap-0 py-3"><div className="px-4 text-xs text-muted-foreground uppercase">{l}</div><div className="num px-4 text-lg font-semibold">{v}</div></Card>)}
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <section className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold tracking-tight">Models &amp; pricing <span className="num text-sm font-normal text-muted-foreground">({r.total})</span></h2>
            <DirectoryFilter action={`/providers/${slug}`} q={q.q} placeholder="Search this provider's models" /></div>
          {listings.length === 0 ? <EmptyState icon={SearchX} title="No listings match" description="Try a different search." /> : (
            <Card className="gap-0 overflow-hidden py-0"><Table>
              <TableHeader className="bg-muted/40"><TableRow className="hover:bg-transparent"><TableHead>Model</TableHead><TableHead>Provider model ID</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Context</TableHead><TableHead className="text-right">Input</TableHead><TableHead className="text-right">Output</TableHead><TableHead className="text-right">Cache read</TableHead></TableRow></TableHeader>
              <TableBody>{listings.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="min-w-48"><Link href={`/models/${l.model.canonicalId}`} className="font-medium hover:text-primary hover:underline">{l.model.name}</Link><div className="text-xs text-muted-foreground">{l.model.lab.name}{l.region ? ` · ${l.region}` : ""}</div></TableCell>
                  <TableCell><span className="flex items-center gap-1"><code className="max-w-60 truncate font-mono text-xs" title={l.providerModelId}>{l.providerModelId}</code><CopyButton value={l.providerModelId} label={`Copy ${l.providerModelId}`} successMessage="Provider model ID copied" /></span></TableCell>
                  <TableCell><Badge variant="outline" className="px-1.5 py-0 text-[10px]">{TYPE_LABEL[l.model.type]}</Badge></TableCell>
                  <TableCell className="num text-right">{formatTokens(l.contextWindow)}</TableCell>
                  <TableCell className="text-right"><PriceText value={l.input} free={l.isFree} /></TableCell><TableCell className="text-right"><PriceText value={l.output} free={l.isFree} /></TableCell><TableCell className="text-right"><PriceText value={l.cacheRead} /></TableCell>
                </TableRow>
              ))}</TableBody></Table></Card>
          )}
          <Pagination page={r.page} pageCount={r.pageCount} total={r.total} pageSize={r.pageSize} sp={sp} path={`/providers/${slug}`} />
        </section>
        <aside><Card className="gap-2"><CardHeader><CardTitle className="text-base">Labs served</CardTitle></CardHeader><CardContent><ul className="space-y-1.5 text-sm">{labs.map((l) => <li key={l.slug} className="flex items-center gap-2"><EntityAvatar name={l.name} size={20} /><Link href={`/labs/${l.slug}`} className="min-w-0 flex-1 truncate hover:text-primary hover:underline">{l.name}</Link><span className="num text-muted-foreground">{l.n}</span></li>)}</ul></CardContent></Card></aside>
      </div>
    </div>
  );
}
