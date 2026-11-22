import type { Metadata } from "next";
import { ExternalLink, SearchX } from "lucide-react";
import Link from "next/link";

import { PROVIDER_TYPE_LABEL } from "@/components/catalog/icons";
import { DirectoryFilter } from "@/components/shared/directory-filter";
import { EmptyState } from "@/components/shared/empty-state";
import { EntityAvatar } from "@/components/shared/entity-avatar";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatPricePerMTok } from "@/lib/format";
import { parseListQuery } from "@/lib/validation/query";
import type { SP } from "@/lib/url";
import { listProviders } from "@/services/directory";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Providers", description: "API providers, the models they serve and where prices start." };

export default async function ProvidersPage({ searchParams }: { searchParams: Promise<SP> }) {
  const q = parseListQuery(await searchParams);
  const rows = await listProviders({ q: q.q, type: q.type, sort: q.sort });
  return (
    <div className="container-page py-6">
      <PageHeader title="Providers" description={`${rows.length} API providers. "From" is the lowest paid standard input price among their listings.`} className="pb-4" />
      <div className="mb-5"><DirectoryFilter action="/providers" q={q.q} type={q.type} sort={q.sort} placeholder="Search providers"
        types={Object.entries(PROVIDER_TYPE_LABEL)} sorts={[["models", "Most models"], ["price", "Lowest price"], ["name", "Name A–Z"]]} /></div>
      {rows.length === 0 ? <EmptyState icon={SearchX} title="No providers match" description="Try a different search term or type." /> : (
        <Card className="gap-0 overflow-hidden py-0">
          <Table>
            <TableHeader className="bg-muted/40"><TableRow className="hover:bg-transparent"><TableHead>Provider</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Models</TableHead><TableHead className="text-right">Listings</TableHead><TableHead className="text-right">From (in $/1M)</TableHead><TableHead>Links</TableHead></TableRow></TableHeader>
            <TableBody>{rows.map((p) => (
              <TableRow key={p.slug}>
                <TableCell className="min-w-64"><Link href={`/providers/${p.slug}`} className="flex items-center gap-2.5"><EntityAvatar name={p.name} size={30} /><div className="min-w-0"><div className="truncate font-medium hover:text-primary hover:underline">{p.name}</div>{p.description && <div className="max-w-md truncate text-xs text-muted-foreground">{p.description}</div>}</div></Link></TableCell>
                <TableCell><Badge variant="outline">{PROVIDER_TYPE_LABEL[p.type]}</Badge></TableCell>
                <TableCell className="num text-right font-medium">{p.modelCount}</TableCell><TableCell className="num text-right text-muted-foreground">{p.listingCount}</TableCell>
                <TableCell className="num text-right">{p.minInputPrice === null ? "—" : formatPricePerMTok(p.minInputPrice)}</TableCell>
                <TableCell>{p.websiteUrl ? <a href={p.websiteUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">Website <ExternalLink className="size-3" /></a> : <span className="text-xs text-muted-foreground">—</span>}</TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
