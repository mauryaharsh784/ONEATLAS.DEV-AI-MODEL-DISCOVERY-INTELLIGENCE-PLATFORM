import type { Metadata } from "next";
import Link from "next/link";

import { CompareCheck } from "@/components/catalog/compare-controls";
import { PriceText, ProviderStack } from "@/components/catalog/model-parts";
import { ModelName } from "@/components/catalog/model-parts";
import { HBarChart } from "@/components/charts/charts";
import { SimulatedNotice, SourceNote } from "@/components/shared/data-notice";
import { PageHeader } from "@/components/shared/page-header";
import { SampleBadge } from "@/components/shared/sample-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatTokens } from "@/lib/format";
import { RANKING_CATEGORIES, parseRankingQuery } from "@/lib/validation/query";
import { buildHref, type SP } from "@/lib/url";
import { cn } from "@/lib/utils";
import { getRanking } from "@/services/rankings";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Rankings", description: "Model leaderboards for overall, intelligence, coding, reasoning, vision, agentic and performance (simulated sample scores)." };

const COLS: [string, string][] = [["intelligence-index", "Intel."], ["coding-index", "Coding"], ["reasoning-index", "Reason."], ["agentic-index", "Agentic"], ["vision-index", "Vision"], ["throughput", "tok/s"]];

export default async function RankingsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { category, limit } = parseRankingQuery(sp);
  const { rows, label, unit, total, basis } = await getRanking(category, limit);
  const pill = "rounded-md px-3 py-1.5 text-sm font-medium transition-colors";
  const best = Math.max(...rows.map((r) => r.score), 1);

  return (
    <div className="container-page py-6">
      <PageHeader title="Rankings" description="Leaderboards by capability. Switch category and list size; every score links back to the model." className="pb-4" />
      <SimulatedNotice className="mb-5" />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Ranking category" className="flex flex-wrap gap-1 rounded-lg border bg-card p-1">
          {RANKING_CATEGORIES.map((c) => (
            <Link key={c.key} role="tab" aria-selected={c.key === category} href={buildHref("/rankings", sp, { category: c.key })} className={cn(pill, c.key === category ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground")}>{c.label}</Link>
          ))}
        </div>
        <div role="group" aria-label="List size" className="flex items-center gap-1 text-sm">
          <span className="mr-1 text-muted-foreground">Show top</span>
          {[10, 20, 50].map((n) => <Link key={n} href={buildHref("/rankings", sp, { limit: String(n) })} aria-current={n === limit ? "true" : undefined} className={cn("rounded-md border px-2.5 py-1", n === limit ? "border-primary bg-primary/10 text-primary" : "bg-card hover:bg-accent")}>{n}</Link>)}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="min-w-0 gap-0 overflow-hidden py-0">
          <Table>
            <TableHeader className="bg-muted/40"><TableRow className="hover:bg-transparent">
              <TableHead className="w-12">#</TableHead><TableHead>Model</TableHead>
              <TableHead className="min-w-40"><span className="inline-flex items-center gap-1.5">{label} {unit === "tokens/s" ? "(tok/s)" : "score"} <SampleBadge label="Sample" /></span></TableHead>
              {COLS.map(([, l]) => <TableHead key={l} className="hidden text-right 2xl:table-cell">{l}</TableHead>)}
              <TableHead>Providers</TableHead><TableHead className="text-right">In / Out $/1M</TableHead><TableHead className="text-right">Context</TableHead><TableHead className="w-10"><span className="sr-only">Compare</span></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.model.id}>
                  <TableCell className="num font-semibold text-muted-foreground">{r.rank}</TableCell>
                  <TableCell className="min-w-56 max-w-72"><ModelName m={r.model} /></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2"><span className="num w-12 font-semibold">{r.score}</span>
                      <span className="h-1.5 w-24 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full bg-primary" style={{ width: `${Math.min(100, (r.score / best) * 100)}%` }} /></span></div>
                  </TableCell>
                  {COLS.map(([k]) => <TableCell key={k} className="num hidden text-right text-muted-foreground 2xl:table-cell">{r.breakdown[k] ?? "—"}</TableCell>)}
                  <TableCell><ProviderStack providers={r.model.providers} count={r.model.providerCount} /></TableCell>
                  <TableCell className="num text-right"><PriceText value={r.model.inputPrice} free={r.model.isFree} /> / <PriceText value={r.model.outputPrice} free={r.model.isFree} /></TableCell>
                  <TableCell className="num text-right">{formatTokens(r.model.contextWindow)}</TableCell>
                  <TableCell><CompareCheck id={r.model.canonicalId} name={r.model.name} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
        <aside className="space-y-4">
          <Card className="gap-2">
            <CardHeader><CardTitle>Top 10 — {label}</CardTitle><CardDescription>{total} models scored</CardDescription></CardHeader>
            <CardContent><HBarChart data={rows.slice(0, 10).map((r) => ({ name: r.model.name.length > 20 ? r.model.name.slice(0, 19) + "…" : r.model.name, score: r.score }))} labelKey="name" valueKey="score" unit={unit ?? ""} labelWidth={130} /></CardContent>
          </Card>
          <Card className="gap-2"><CardHeader><CardTitle>How to read this</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground"><p>{basis}</p><p>The detail columns (wide screens) show the same model&apos;s score on related benchmarks — the score breakdown.</p>
              <p><Link href="/benchmarks" className="text-primary hover:underline">Benchmark definitions &amp; methodology →</Link></p></CardContent></Card>
        </aside>
      </div>
      <SourceNote className="mt-4">Prices and context come from the LiteLLM registry; the scores themselves are simulated.</SourceNote>
    </div>
  );
}
