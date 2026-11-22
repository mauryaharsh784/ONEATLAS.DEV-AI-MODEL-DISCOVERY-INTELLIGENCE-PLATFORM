import type { Metadata } from "next";
import Link from "next/link";

import { GroupedBarChart } from "@/components/charts/charts";
import { SimulatedNotice } from "@/components/shared/data-notice";
import { PageHeader } from "@/components/shared/page-header";
import { SampleBadge } from "@/components/shared/sample-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getBenchmarkComparison, listBenchmarks } from "@/services/benchmarks";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Benchmarks", description: "Benchmark categories, descriptions, methodology and model score comparisons (simulated sample data)." };

const CAT: Record<string, string> = { INTELLIGENCE: "Intelligence", CODING: "Coding", REASONING: "Reasoning", VISION: "Vision", AGENTIC: "Agentic", PERFORMANCE: "Performance", KNOWLEDGE: "Knowledge", MATH: "Math", ARENA: "Arena" };

export default async function BenchmarksPage() {
  const [benches, cmp] = await Promise.all([listBenchmarks(), getBenchmarkComparison(8)]);
  return (
    <div className="container-page py-6">
      <PageHeader title="Benchmarks" description={`${benches.length} benchmark definitions across ${new Set(benches.map((b) => b.category)).size} categories, with methodology and per-benchmark leaderboards.`} className="pb-4" />
      <SimulatedNotice className="mb-5" />
      <Card className="mb-6 gap-3">
        <CardHeader><div className="flex items-center justify-between gap-2"><div><CardTitle>Score comparison — top 8 models</CardTitle><CardDescription>Highest average across the five main indices, shown on each index (0–100).</CardDescription></div><SampleBadge /></div></CardHeader>
        <CardContent><GroupedBarChart data={cmp.data} keys={cmp.benches.map((b) => ({ slug: b.slug, label: b.label.replace(" Index", "") }))} /></CardContent>
      </Card>
      <h2 className="mb-3 text-lg font-semibold tracking-tight">Benchmark catalog</h2>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {benches.map((b) => (
          <Card key={b.slug} className="gap-3">
            <CardHeader>
              <div className="flex items-center justify-between"><Badge variant="secondary">{CAT[b.category]}</Badge>{b.isSimulated && <SampleBadge />}</div>
              <CardTitle className="pt-1"><Link href={`/benchmarks/${b.slug}`} className="hover:text-primary hover:underline">{b.name}</Link></CardTitle>
              <CardDescription>{b.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="line-clamp-2 text-xs text-muted-foreground"><span className="font-medium text-foreground">Methodology:</span> {b.methodology}</p>
              <ol className="space-y-1 text-sm">
                {b.top.map((t, i) => <li key={t.canonicalId} className="flex items-center gap-2"><span className="num w-4 text-muted-foreground">{i + 1}</span><Link href={`/models/${t.canonicalId}`} className="min-w-0 flex-1 truncate hover:text-primary hover:underline">{t.name}</Link><span className="num text-muted-foreground">{t.score}</span></li>)}
              </ol>
              <div className="flex items-center justify-between text-xs text-muted-foreground"><span className="num">{b.modelCount} models scored · {b.unit}</span><Link href={`/benchmarks/${b.slug}`} className="font-medium text-primary hover:underline">Full leaderboard →</Link></div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
