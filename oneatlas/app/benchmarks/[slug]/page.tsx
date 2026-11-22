import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CompareCheck } from "@/components/catalog/compare-controls";
import { ModelName, PriceText, ProviderStack } from "@/components/catalog/model-parts";
import { HBarChart } from "@/components/charts/charts";
import { SimulatedNotice } from "@/components/shared/data-notice";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { parseRankingQuery } from "@/lib/validation/query";
import { buildHref, type SP } from "@/lib/url";
import { cn } from "@/lib/utils";
import { getBenchmark } from "@/services/benchmarks";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }>; searchParams: Promise<SP> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const b = await getBenchmark((await params).slug, 1);
  return { title: b ? `${b.benchmark.name} leaderboard` : "Benchmark not found" };
}

export default async function BenchmarkPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const { limit } = parseRankingQuery({ limit: sp.limit });
  const data = await getBenchmark(slug, limit);
  if (!data) notFound();
  const { benchmark: b, stats, board } = data;
  const f = (n: number | null) => (n === null ? "—" : n.toFixed(1));
  return (
    <div className="container-page py-6">
      <nav aria-label="Breadcrumb" className="mb-3 text-sm text-muted-foreground"><Link href="/benchmarks" className="hover:text-foreground">Benchmarks</Link> / <span className="text-foreground">{b.name}</span></nav>
      <PageHeader title={b.name} description={b.description ?? undefined} eyebrow={<Badge variant="secondary">{b.category.charAt(0) + b.category.slice(1).toLowerCase()}</Badge>} className="pb-4" />
      {b.isSimulated && <SimulatedNotice className="mb-5" />}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {([["Models scored", stats.count], ["Average", f(stats.avg)], ["Lowest", f(stats.min)], ["Highest", f(stats.max)]] as const).map(([l, v]) => <Card key={l} className="gap-0 py-3"><div className="px-4 text-xs text-muted-foreground uppercase">{l}</div><div className="num px-4 text-xl font-semibold">{v}</div></Card>)}
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="min-w-0 gap-0 overflow-hidden py-0">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="font-semibold">Leaderboard</h2>
            <div className="flex items-center gap-1 text-sm">{[10, 20, 50].map((n) => <Link key={n} href={buildHref(`/benchmarks/${slug}`, sp, { limit: String(n) })} className={cn("rounded-md border px-2.5 py-1", n === limit ? "border-primary bg-primary/10 text-primary" : "bg-card hover:bg-accent")}>Top {n}</Link>)}</div>
          </div>
          <Table>
            <TableHeader className="bg-muted/40"><TableRow className="hover:bg-transparent"><TableHead className="w-12">#</TableHead><TableHead>Model</TableHead><TableHead className="text-right">{b.unit ?? "Score"}</TableHead><TableHead>Providers</TableHead><TableHead className="text-right">In $/1M</TableHead><TableHead className="w-10"><span className="sr-only">Compare</span></TableHead></TableRow></TableHeader>
            <TableBody>{board.map((r) => (
              <TableRow key={r.model.id}><TableCell className="num font-semibold text-muted-foreground">{r.rank}</TableCell><TableCell className="min-w-56"><ModelName m={r.model} /></TableCell>
                <TableCell className="num text-right font-semibold">{r.score}</TableCell><TableCell><ProviderStack providers={r.model.providers} count={r.model.providerCount} /></TableCell>
                <TableCell className="text-right"><PriceText value={r.model.inputPrice} free={r.model.isFree} /></TableCell><TableCell><CompareCheck id={r.model.canonicalId} name={r.model.name} /></TableCell></TableRow>
            ))}</TableBody>
          </Table>
        </Card>
        <aside className="space-y-4">
          <Card className="gap-2"><CardHeader><CardTitle>Evaluation methodology</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">{b.methodology}{b.scaleMin !== null && <p className="mt-2">Scale: {b.scaleMin}–{b.scaleMax} {b.unit}.</p>}</CardContent></Card>
          <Card className="gap-2"><CardHeader><CardTitle>Top 10</CardTitle><CardDescription>Model score comparison</CardDescription></CardHeader>
            <CardContent><HBarChart data={board.slice(0, 10).map((r) => ({ name: r.model.name.length > 20 ? r.model.name.slice(0, 19) + "…" : r.model.name, score: r.score }))} labelKey="name" valueKey="score" unit={b.unit ?? ""} labelWidth={130} /></CardContent></Card>
        </aside>
      </div>
    </div>
  );
}
