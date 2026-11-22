import { ArrowRight, Building2, Cpu, Gift, Layers, Server, Unlock } from "lucide-react";
import Link from "next/link";

import { CAPABILITY_META, TYPE_LABEL } from "@/components/catalog/icons";
import { CompactModelRow } from "@/components/catalog/model-parts";
import { ColumnChart, DonutChart, HBarChart } from "@/components/charts/charts";
import { GlobalSearch } from "@/components/search/global-search";
import { SourceNote } from "@/components/shared/data-notice";
import { EntityAvatar } from "@/components/shared/entity-avatar";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatInteger } from "@/lib/format";
import { getOverview } from "@/services/overview";

export const dynamic = "force-dynamic";

function Panel({ title, description, href, children, className }: { title: string; description?: string; href?: string; children: React.ReactNode; className?: string }) {
  return (
    <Card className={`min-w-0 gap-0 py-0 ${className ?? ""}`}>
      <CardHeader className="flex flex-row items-start justify-between gap-2 px-4 py-3">
        <div className="space-y-0.5"><CardTitle className="text-sm">{title}</CardTitle>{description && <CardDescription className="text-xs">{description}</CardDescription>}</div>
        {href && <Link href={href} className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline">View all <ArrowRight className="size-3" /></Link>}
      </CardHeader>
      <div className="border-t">{children}</div>
    </Card>
  );
}

const CHIPS: [string, string][] = [
  ["Reasoning", "/models?cap=reasoning"], ["Tool calling", "/models?cap=tool_calling"], ["Free", "/models?free=1"],
  ["Open weights", "/models?open=1"], ["1M+ context", "/models?minContext=1000000"], ["Multimodal", "/models?multimodal=1&type=text"], ["Newest", "/models?sort=released"],
];

export default async function HomePage() {
  const o = await getOverview();
  const c = o.counts;
  return (
    <div className="container-page space-y-5 py-6">
      <section className="space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">AI model intelligence</h1>
            <p className="max-w-2xl text-sm text-muted-foreground">Compare {formatInteger(c.models)} models from {c.labs} labs across {c.providers} providers — price, context, capabilities and release history, from one database.</p>
          </div>
          <GlobalSearch size="lg" className="w-full lg:max-w-xl" />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs text-muted-foreground">Quick filters</span>
          {CHIPS.map(([l, h]) => <Link key={l} href={h} className="rounded-full border bg-card px-3 py-1 text-xs font-medium transition-colors hover:border-primary/50 hover:bg-accent">{l}</Link>)}
        </div>
      </section>

      <section aria-label="Platform statistics" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="AI models" value={formatInteger(c.models)} icon={Cpu} hint={`${c.withBenchmarks} with sample scores`} />
        <StatCard label="Providers" value={formatInteger(c.providers)} icon={Server} hint={`${formatInteger(c.listings)} model listings`} />
        <StatCard label="AI labs" value={formatInteger(c.labs)} icon={Building2} />
        <StatCard label="Open-weight" value={formatInteger(c.openWeights)} icon={Unlock} hint="inferred from open-model hosts" />
        <StatCard label="Free models" value={formatInteger(c.free)} icon={Gift} hint="$0 input and output" />
        <StatCard label="Model types" value={o.typeDistribution.length} icon={Layers} hint={o.lastIngested ? `Data ingested ${formatDate(o.lastIngested)}` : undefined} />
      </section>

      <div className="grid gap-5 lg:grid-cols-12">
        <div className="min-w-0 space-y-5 lg:col-span-8">
          <div className="grid gap-5 md:grid-cols-2 [&>*]:min-w-0">
            <Panel title="Trending" description="Recent releases available from the most providers" href="/models?sort=released">
              <ul className="divide-y">{o.trending.length ? o.trending.map((m) => <CompactModelRow key={m.id} m={m} right="providers" />) : <li className="p-4 text-sm text-muted-foreground">No releases in the last 180 days.</li>}</ul>
            </Panel>
            <Panel title="Recently released" description="Newest models with a known release date" href="/models?sort=released">
              <ul className="divide-y">{o.recent.slice(0, 6).map((m) => <CompactModelRow key={m.id} m={m} right="released" />)}</ul>
            </Panel>
          </div>

          <Panel title="Popular models" description="Most widely available across providers" href="/models">
            <ul className="grid divide-y md:grid-cols-2 md:divide-y-0">{o.popular.map((m) => <CompactModelRow key={m.id} m={m} right="price" className="md:border-b md:odd:border-r" />)}</ul>
            <p className="border-t px-4 py-2 text-[11px] text-muted-foreground">Right column: input / output USD per 1M tokens.</p>
          </Panel>

          <div className="grid gap-5 md:grid-cols-2 [&>*]:min-w-0">
            <Panel title="Model category distribution" description="By model type">
              <div className="p-4"><DonutChart height={150} data={o.typeDistribution.map((t) => ({ name: TYPE_LABEL[t.type] ?? t.type, value: t.count }))} /></div>
            </Panel>
            <Panel title="Latest model releases" description="Models released per month (known dates only)">
              <div className="p-4"><ColumnChart data={o.releasesPerMonth.map((r) => ({ month: new Date(r.month + '-01T00:00:00Z').toLocaleString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' }), count: r.count }))} xKey="month" yKey="count" yLabel="Models" rotate /></div>
            </Panel>
          </div>

          <Panel title="Pricing insights" description="Text models, USD per 1M input tokens">
            <div className="grid gap-px bg-border md:grid-cols-2">
              <div className="bg-card p-4"><h3 className="mb-2 text-xs font-medium text-muted-foreground uppercase">Price distribution</h3><ColumnChart data={o.priceBuckets.map((b) => ({ label: b.label, count: b.count }))} xKey="label" yKey="count" yLabel="Models" color="var(--chart-2)" height={210} rotate /></div>
              <div className="bg-card p-4"><h3 className="mb-2 text-xs font-medium text-muted-foreground uppercase">Median input price by lab</h3><HBarChart data={o.labPricing.map((l) => ({ lab: l.lab, median: l.median }))} labelKey="lab" valueKey="median" unit="$/1M" color="var(--chart-3)" labelWidth={90} height={190} /></div>
            </div>
            <div className="border-t">
              <h3 className="px-4 pt-3 text-xs font-medium text-muted-foreground uppercase">Cheapest paid models with tool calling &amp; 100K+ context</h3>
              <ul className="divide-y">{o.cheapest.map((m) => <CompactModelRow key={m.id} m={m} right="price" />)}</ul>
            </div>
          </Panel>
        </div>

        <aside className="min-w-0 space-y-5 lg:col-span-4">
          <Panel title="Compare shortcuts" description="Prebuilt comparisons from the catalog">
            <ul className="divide-y">{o.compareShortcuts.map((s) => (
              <li key={s.title}><Link href={`/compare?${new URLSearchParams({ ids: s.ids.join(",") })}`} className="block px-4 py-3 hover:bg-accent/50"><span className="flex items-center justify-between text-sm font-medium">{s.title}<ArrowRight className="size-3.5 text-muted-foreground" /></span><span className="mt-0.5 block text-xs text-muted-foreground">{s.names.join(" · ")}</span></Link></li>
            ))}
              <li><Link href="/compare" className="block px-4 py-3 text-sm text-primary hover:bg-accent/50">Build your own comparison →</Link></li></ul>
          </Panel>
          <Panel title="Popular providers" description="By number of distinct models" href="/providers">
            <ul className="divide-y">{o.popularProviders.map((p) => (
              <li key={p.slug}><Link href={`/providers/${p.slug}`} className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-accent/50"><EntityAvatar name={p.name} size={26} /><span className="min-w-0 flex-1 truncate text-sm font-medium">{p.name}</span><span className="num text-xs text-muted-foreground">{p.models} models</span></Link></li>
            ))}</ul>
          </Panel>
          <Panel title="Featured AI labs" description="Labs with the most models" href="/labs">
            <ul className="divide-y">{o.featuredLabs.map((l) => (
              <li key={l.slug}><Link href={`/labs/${l.slug}`} className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-accent/50"><EntityAvatar name={l.name} size={26} /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{l.name}</span><span className="block text-xs text-muted-foreground">{l.models} models · {l.open} open-weight</span></span><ArrowRight className="size-3.5 text-muted-foreground" /></Link></li>
            ))}</ul>
          </Panel>
          <Panel title="Capability coverage" description="Share of active text models">
            <ul className="space-y-2.5 p-4">{o.capabilityCoverage.map((cc) => { const meta = CAPABILITY_META[cc.key]; return (
              <li key={cc.key} className="text-sm"><div className="mb-1 flex items-center justify-between"><span className="flex items-center gap-1.5">{meta && <meta.icon className="size-3.5 text-muted-foreground" />}{cc.name}</span><span className="num text-xs text-muted-foreground">{cc.pct}%</span></div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${cc.pct}%` }} /></div></li>); })}</ul>
          </Panel>
        </aside>
      </div>
      <SourceNote>Prices, limits and capabilities: LiteLLM community registry (snapshot). &ldquo;Trending&rdquo; and &ldquo;Popular&rdquo; are availability-based — OneAtlas has no usage telemetry. Benchmark scores elsewhere on the site are simulated samples.</SourceNote>
    </div>
  );
}
