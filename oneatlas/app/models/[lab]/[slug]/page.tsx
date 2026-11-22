import type { Metadata } from "next";
import { Brain, ExternalLink, Minus, Check, X as XIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CompareButton } from "@/components/catalog/compare-controls";
import { CAPABILITY_META, MODALITY_META, PROVIDER_TYPE_LABEL, TYPE_LABEL } from "@/components/catalog/icons";
import { CompactModelRow, PriceText, WeightsBadge, isNew } from "@/components/catalog/model-parts";
import { CopyButton } from "@/components/shared/copy-button";
import { SourceNote } from "@/components/shared/data-notice";
import { EntityAvatar } from "@/components/shared/entity-avatar";
import { SampleBadge } from "@/components/shared/sample-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatInteger, formatPricePerMTok, formatTokens } from "@/lib/format";
import { getModelDetail, getRelatedModels } from "@/services/models";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ lab: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lab, slug } = await params;
  const m = await getModelDetail(lab, slug);
  return m ? { title: `${m.name} — pricing, context & providers`, description: m.description ?? undefined } : { title: "Model not found" };
}

function Stat({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="px-4 py-3.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="num mt-1 font-mono text-xl font-semibold tracking-tight">{children}</dd>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
function Spec({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex items-start justify-between gap-4 py-2 text-sm"><dt className="text-muted-foreground">{label}</dt><dd className="text-right">{children}</dd></div>;
}

export default async function ModelDetailPage({ params }: Props) {
  const { lab, slug } = await params;
  const m = await getModelDetail(lab, slug);
  if (!m) notFound();
  const related = await getRelatedModels(m);
  const std = m.listings.flatMap((l) => l.pricing.filter((p) => p.tier === "STANDARD").map((p) => p.input).filter((v): v is number => v !== null && v > 0));
  const cheapest = std.length ? Math.min(...std) : null;
  const tierLabel = (t: string, th: number | null) => t === "LONG_CONTEXT" ? `>${formatTokens(th)} ctx` : t === "BATCH" ? "Batch" : t;

  return (
    <>
    <div className="relative isolate overflow-hidden border-b">
      <div aria-hidden className="hero-wash absolute inset-0 -z-20" />
      <div aria-hidden className="bg-grid absolute inset-0 -z-10 opacity-50" />
    <div className="container-page pt-6 pb-8">
      <nav aria-label="Breadcrumb" className="mb-5 flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/models" className="hover:text-foreground">Models</Link> / <Link href={`/labs/${m.lab.slug}`} className="hover:text-foreground">{m.lab.name}</Link> / <span className="text-foreground">{m.name}</span>
      </nav>

      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <EntityAvatar name={m.lab.name} size={52} />
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{m.name}</h1>
              {isNew(m.releaseDate) && <Badge variant="info">New</Badge>}
              {m.status === "DEPRECATED" && <Badge variant="warning">Deprecated</Badge>}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <code className="rounded bg-muted px-2 py-0.5 font-mono text-xs">{m.canonicalId}</code>
              <CopyButton value={m.canonicalId} label="Copy model ID" successMessage="Model ID copied" />
              <Badge variant="outline">{TYPE_LABEL[m.type]}</Badge>
              <WeightsBadge open={m.openWeights} />
              {m.capabilities.includes("reasoning") && <Badge variant="success"><Brain /> Reasoning</Badge>}
            </div>
            {m.description && <p className="max-w-3xl text-sm text-muted-foreground">{m.description}</p>}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <CompareButton id={m.canonicalId} name={m.name} size="default" />
          {m.docsUrl && <Button variant="outline" asChild><a href={m.docsUrl} target="_blank" rel="noopener noreferrer">Docs <ExternalLink /></a></Button>}
          {m.websiteUrl && <Button variant="outline" asChild><a href={m.websiteUrl} target="_blank" rel="noopener noreferrer">Official site <ExternalLink /></a></Button>}
        </div>
      </header>
    </div>
    </div>
    <div className="container-page py-6">
      <Card className="edge-highlight overflow-hidden bg-card/80 py-0">
        <dl className="grid grid-cols-2 divide-x divide-y sm:grid-cols-3 sm:divide-y-0 lg:grid-cols-6">
          <Stat label="Context" hint="max input tokens">{formatTokens(m.contextWindow)}</Stat>
          <Stat label="Max output">{formatTokens(m.maxOutputTokens)}</Stat>
          <Stat label="Input / 1M"><PriceText value={m.inputPrice} free={m.isFree} className="text-xl" /></Stat>
          <Stat label="Output / 1M"><PriceText value={m.outputPrice} free={m.isFree} className="text-xl" /></Stat>
          <Stat label="Cache read / 1M"><PriceText value={m.cacheReadPrice} className="text-xl" /></Stat>
          <Stat label="Providers" hint={`${m.listings.length} listing${m.listings.length === 1 ? "" : "s"}`}>{m.providerCount}</Stat>
        </dl>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          <Card className="gap-3">
            <CardHeader><CardTitle>Providers &amp; pricing</CardTitle><CardDescription>Where this model is served, with the exact ID to send in each provider&apos;s API. USD per 1M tokens.</CardDescription></CardHeader>
            <CardContent className="px-0">
              <div className="max-h-[30rem] overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-card"><TableRow><TableHead>Provider</TableHead><TableHead>Provider model ID</TableHead><TableHead className="text-right">Context</TableHead><TableHead className="text-right">Input</TableHead><TableHead className="text-right">Output</TableHead><TableHead className="text-right">Cache read</TableHead><TableHead>Other tiers</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {m.listings.map((l) => {
                      const s = l.pricing.find((p) => p.tier === "STANDARD");
                      const others = l.pricing.filter((p) => p.tier !== "STANDARD");
                      return (
                        <TableRow key={l.id}>
                          <TableCell>
                            <Link href={`/providers/${l.provider.slug}`} className="flex items-center gap-2 font-medium hover:text-primary"><EntityAvatar name={l.provider.name} size={22} />{l.provider.name}</Link>
                            <span className="ml-8 text-[11px] text-muted-foreground">{PROVIDER_TYPE_LABEL[l.provider.type]}{l.isFirstParty && l.provider.type !== "FIRST_PARTY" ? " · first-party" : ""}{l.region ? ` · ${l.region}` : ""}</span>
                          </TableCell>
                          <TableCell><span className="flex items-center gap-1"><code className="max-w-56 truncate font-mono text-xs" title={l.providerModelId}>{l.providerModelId}</code><CopyButton value={l.providerModelId} label={`Copy ${l.providerModelId}`} successMessage="Provider model ID copied" /></span></TableCell>
                          <TableCell className="num text-right">{formatTokens(l.contextWindow)}</TableCell>
                          <TableCell className="text-right">{s ? <span className={s.input !== null && s.input === cheapest ? "font-semibold text-success" : ""}><PriceText value={s.input} free={s.isFree} /></span> : "—"}</TableCell>
                          <TableCell className="text-right">{s ? <PriceText value={s.output} free={s.isFree} /> : "—"}</TableCell>
                          <TableCell className="text-right">{s ? <PriceText value={s.cacheRead} /> : "—"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{others.length ? others.map((o) => `${tierLabel(o.tier, o.contextThreshold)}: ${formatPricePerMTok(o.input)}/${formatPricePerMTok(o.output)}`).join(" · ") : "—"}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <div className="px-5 pt-3"><SourceNote>Source: LiteLLM community registry{m.sourceUpdatedAt ? `, snapshot ${formatDate(m.sourceUpdatedAt)}` : ""}. Green marks the lowest paid standard input price. Not a live quote — confirm on the provider&apos;s pricing page.</SourceNote></div>
            </CardContent>
          </Card>

          <Card className="gap-3">
            <CardHeader><CardTitle>Capabilities &amp; modalities</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <ul className="grid gap-2 sm:grid-cols-2">
                {m.allCapabilities.length === 0 && <li className="text-sm text-muted-foreground">No capability flags are recorded for this model.</li>}
                {m.allCapabilities.map((c) => {
                  const meta = CAPABILITY_META[c.key];
                  return (
                    <li key={c.key} className="flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm">
                      {meta && <meta.icon className="size-4 text-muted-foreground" />}
                      <span className="flex-1">{c.name}</span>
                      {c.support === "YES" ? <Badge variant="success"><Check /> Yes</Badge> : c.support === "NO" ? <Badge variant="outline"><XIcon /> No</Badge> : <Badge variant="outline"><Minus /> Unknown</Badge>}
                    </li>
                  );
                })}
              </ul>
              <div className="grid gap-3 sm:grid-cols-2">
                {([["Input modalities", m.inputModalities], ["Output modalities", m.outputModalities]] as const).map(([label, mods]) => (
                  <div key={label}><h3 className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{label}</h3>
                    <div className="flex flex-wrap gap-1.5">{mods.length ? mods.map((x) => { const mm = MODALITY_META[x]; return <Badge key={x} variant="secondary"><mm.icon /> {mm.label}</Badge>; }) : <span className="text-sm text-muted-foreground">—</span>}</div></div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="gap-3">
            <CardHeader><div className="flex items-center justify-between gap-2"><CardTitle>Benchmark performance</CardTitle>{m.scores.length > 0 && <SampleBadge />}</div>
              <CardDescription>Simulated sample scores — not measurements of this model.</CardDescription></CardHeader>
            <CardContent>
              {m.scores.length === 0 ? <p className="text-sm text-muted-foreground">Not scored. Sample benchmarks cover active text models that have a recorded price.</p> : (
                <ul className="space-y-2.5">
                  {m.scores.map((s) => {
                    const pct = s.slug === "throughput" ? Math.min(100, (s.score / 350) * 100) : s.slug === "arena-elo" ? Math.max(0, ((s.score - 1000) / 400) * 100) : s.score;
                    return (
                      <li key={s.slug} className="grid grid-cols-[9rem_1fr_6.5rem] items-center gap-3 text-sm">
                        <span className="truncate">{s.name}</span>
                        <span className="h-2 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full bg-primary" style={{ width: `${pct}%` }} /></span>
                        <span className="num text-right">{s.score}{s.unit === "tokens/s" ? " tok/s" : ""} <span className="text-xs text-muted-foreground">#{s.rank}</span></span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          {related.length > 0 && (
            <Card className="gap-0 py-0">
              <CardHeader className="px-5 py-4"><CardTitle>Related models</CardTitle><CardDescription>Same family from {m.lab.name}, then models at a similar price.</CardDescription></CardHeader>
              <ul className="divide-y border-t">{related.map((r) => <CompactModelRow key={r.id} m={r} right="price" />)}</ul>
            </Card>
          )}
        </div>

        <aside className="space-y-4">
          <Card className="gap-1">
            <CardHeader><CardTitle>Specifications</CardTitle></CardHeader>
            <CardContent>
              <dl className="divide-y">
                <Spec label="Lab"><Link href={`/labs/${m.lab.slug}`} className="text-primary hover:underline">{m.lab.name}</Link></Spec>
                <Spec label="Family">{m.family ?? "—"}</Spec>
                <Spec label="Type">{TYPE_LABEL[m.type]}</Spec>
                <Spec label="Status">{m.status === "ACTIVE" ? "Active" : m.status === "PREVIEW" ? "Preview" : "Deprecated"}</Spec>
                <Spec label="Weights">{m.openWeights ? "Open (inferred)" : "Closed / not known open"}</Spec>
                <Spec label="License">{m.license ?? "—"}</Spec>
                <Spec label="Released">{formatDate(m.releaseDate)}</Spec>
                <Spec label="Knowledge cutoff">{formatDate(m.knowledgeCutoff)}</Spec>
                <Spec label="Context window">{formatInteger(m.contextWindow)}</Spec>
                <Spec label="Max input">{formatInteger(m.maxInputTokens)}</Spec>
                <Spec label="Max output">{formatInteger(m.maxOutputTokens)}</Spec>
                <Spec label="API parameters">{m.supportedParameters.length ? m.supportedParameters.join(", ") : "—"}</Spec>
              </dl>
              {m.releaseDate && m.releaseNote && <p className="mt-3 text-xs text-muted-foreground">Release date: {m.releaseNote}</p>}
            </CardContent>
          </Card>
          <Card className="gap-2">
            <CardHeader><CardTitle>Data &amp; links</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="text-muted-foreground">Specs and prices ingested from the LiteLLM registry{m.sourceUpdatedAt ? ` (${formatDate(m.sourceUpdatedAt)})` : ""}.</p>
              <ul className="space-y-1.5">
                {m.sourceUrl && <li><a className="inline-flex items-center gap-1 text-primary hover:underline" href={m.sourceUrl} target="_blank" rel="noopener noreferrer">Source record <ExternalLink className="size-3" /></a></li>}
                {m.docsUrl && <li><a className="inline-flex items-center gap-1 text-primary hover:underline" href={m.docsUrl} target="_blank" rel="noopener noreferrer">{m.lab.name} documentation <ExternalLink className="size-3" /></a></li>}
                {m.websiteUrl && <li><a className="inline-flex items-center gap-1 text-primary hover:underline" href={m.websiteUrl} target="_blank" rel="noopener noreferrer">{m.lab.name} website <ExternalLink className="size-3" /></a></li>}
                {m.releaseUrl && <li><a className="inline-flex items-center gap-1 text-primary hover:underline" href={m.releaseUrl} target="_blank" rel="noopener noreferrer">Release listing <ExternalLink className="size-3" /></a></li>}
              </ul>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
    </>
  );
}
