import type { Metadata } from "next";
import { GitCompareArrows, X } from "lucide-react";
import Link from "next/link";

import { CAPABILITY_META, MODALITY_META, TYPE_LABEL } from "@/components/catalog/icons";
import { CompareAdd, CopyLinkButton } from "@/components/catalog/compare-add";
import { EmptyState } from "@/components/shared/empty-state";
import { EntityAvatar } from "@/components/shared/entity-avatar";
import { PageHeader } from "@/components/shared/page-header";
import { SampleBadge } from "@/components/shared/sample-badge";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatDate, formatPricePerMTok, formatTokens } from "@/lib/format";
import { parseModelQuery } from "@/lib/validation/query";
import type { SP } from "@/lib/url";
import { cn } from "@/lib/utils";
import { getOverview } from "@/services/overview";
import { getComparison } from "@/services/models";
import type { ModelRow } from "@/types/catalog";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Compare models" };

type Cell = { text: React.ReactNode; value?: number | null };
type Row = { label: string; cells: Cell[]; best?: "min" | "max"; note?: React.ReactNode };

function bestSet(cells: Cell[], mode?: "min" | "max"): Set<number> {
  if (!mode) return new Set();
  const vals = cells.map((c, i) => [i, c.value] as const).filter((x): x is readonly [number, number] => typeof x[1] === "number");
  if (vals.length < 2) return new Set();
  const target = (mode === "min" ? Math.min : Math.max)(...vals.map((v) => v[1]));
  if (vals.every((v) => v[1] === target)) return new Set();
  return new Set(vals.filter((v) => v[1] === target).map((v) => v[0]));
}

export default async function ComparePage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { ids } = parseModelQuery({ ids: sp.ids });
  const { models, scores, benchmarks } = await getComparison(ids);
  const valid = models.map((m) => m.canonicalId);
  const href = (list: string[]) => (list.length ? `/compare?${new URLSearchParams({ ids: list.join(",") })}` : "/compare");

  if (models.length < 2) {
    const shortcuts = (await getOverview()).compareShortcuts;
    return (
      <div className="container-page py-6">
        <PageHeader title="Compare models" description="Put 2–5 models side by side: price, context, capabilities, modalities and benchmarks. The URL holds the selection, so you can share it." actions={<CompareAdd ids={valid} />} />
        {models.length === 1 && <p className="mb-4 text-sm text-muted-foreground">Selected: <strong>{models[0].name}</strong>. Add at least one more model to compare.</p>}
        <EmptyState icon={GitCompareArrows} title="Pick models to compare" description="Search above, or tick the checkbox on any row in the model catalog and open the compare tray. Or start from a ready-made comparison:"
          action={<div className="flex flex-wrap justify-center gap-2">{shortcuts.map((s) => <Link key={s.title} href={href(s.ids)} className="rounded-lg border bg-card px-3 py-2 text-left text-sm hover:bg-accent"><span className="block font-medium">{s.title}</span><span className="text-xs text-muted-foreground">{s.names.join(" · ")}</span></Link>)}</div>} />
      </div>
    );
  }

  const col = (fn: (m: ModelRow) => Cell): Cell[] => models.map(fn);
  const capRow = (key: string): Row => ({ label: CAPABILITY_META[key].label, cells: col((m) => ({ text: m.capabilities.includes(key) ? <Badge variant="success">Yes</Badge> : <span className="text-muted-foreground">—</span>, value: m.capabilities.includes(key) ? 1 : 0 })), best: "max" });
  const sections: { title: string; rows: Row[] }[] = [
    { title: "Overview", rows: [
      { label: "Lab", cells: col((m) => ({ text: <Link href={`/labs/${m.lab.slug}`} className="hover:text-primary hover:underline">{m.lab.name}</Link> })) },
      { label: "Type", cells: col((m) => ({ text: TYPE_LABEL[m.type] })) },
      { label: "Released", cells: col((m) => ({ text: formatDate(m.releaseDate), value: m.releaseDate ? new Date(m.releaseDate).getTime() : null })), best: "max" },
      { label: "Weights", cells: col((m) => ({ text: m.openWeights ? "Open" : "Closed" })) },
      { label: "Providers", cells: col((m) => ({ text: m.providerCount, value: m.providerCount })), best: "max" },
    ] },
    { title: "Pricing (USD per 1M tokens)", rows: [
      { label: "Input", cells: col((m) => ({ text: m.isFree ? "Free" : formatPricePerMTok(m.inputPrice), value: m.inputPrice })), best: "min" },
      { label: "Output", cells: col((m) => ({ text: m.isFree ? "Free" : formatPricePerMTok(m.outputPrice), value: m.outputPrice })), best: "min" },
      { label: "Cache read", cells: col((m) => ({ text: formatPricePerMTok(m.cacheReadPrice), value: m.cacheReadPrice })), best: "min" },
    ] },
    { title: "Limits", rows: [
      { label: "Context window", cells: col((m) => ({ text: formatTokens(m.contextWindow), value: m.contextWindow })), best: "max" },
      { label: "Max output", cells: col((m) => ({ text: formatTokens(m.maxOutputTokens), value: m.maxOutputTokens })), best: "max" },
    ] },
    { title: "Capabilities", rows: Object.keys(CAPABILITY_META).map(capRow) },
    { title: "Modalities", rows: [
      { label: "Input", cells: col((m) => ({ text: m.inputModalities.map((x) => MODALITY_META[x].label).join(", ") || "—", value: m.inputModalities.length })), best: "max" },
      { label: "Output", cells: col((m) => ({ text: m.outputModalities.map((x) => MODALITY_META[x].label).join(", ") || "—", value: m.outputModalities.length })), best: "max" },
    ] },
  ];
  if (benchmarks.length) sections.push({ title: "Benchmarks", rows: benchmarks.map((b) => ({
    label: b.name, note: <SampleBadge label="Sample" />, best: "max" as const,
    cells: col((m) => { const v = scores[m.id]?.[b.slug]; return { text: v === undefined ? <span className="text-muted-foreground">Not scored</span> : `${v}${b.unit === "tokens/s" ? " tok/s" : ""}`, value: v ?? null }; }),
  })) });

  return (
    <div className="container-page py-6">
      <PageHeader title="Compare models" description="Best value in each row is highlighted. Selection is stored in the URL." className="pb-4"
        actions={<div className="flex flex-wrap items-center gap-2"><CompareAdd ids={valid} /><CopyLinkButton /></div>} />
      <Card className="relative gap-0 overflow-x-auto py-0">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b bg-muted/30 align-top">
              <th className="w-44 px-4 py-4 text-left text-xs font-medium tracking-wide text-muted-foreground uppercase">Model</th>
              {models.map((m) => (
                <th key={m.id} className="px-4 py-4 text-left font-normal">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2"><EntityAvatar name={m.lab.name} size={30} />
                      <div className="min-w-0"><Link href={`/models/${m.canonicalId}`} className="block truncate font-semibold hover:text-primary hover:underline">{m.name}</Link><span className="block truncate font-mono text-[11px] text-muted-foreground">{m.canonicalId}</span></div></div>
                    <Link href={href(valid.filter((v) => v !== m.canonicalId))} aria-label={`Remove ${m.name}`} className="rounded p-1 text-muted-foreground hover:bg-accent"><X className="size-4" /></Link>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sections.map((s) => (
              <SectionRows key={s.title} title={s.title} rows={s.rows} cols={models.length} />
            ))}
          </tbody>
        </table>
      </Card>
      <p className="mt-3 text-xs text-muted-foreground">Prices and limits: LiteLLM community registry. Benchmark rows are simulated sample scores. Highlighting is skipped when all values are equal.</p>
    </div>
  );
}

function SectionRows({ title, rows, cols }: { title: string; rows: Row[]; cols: number }) {
  return (
    <>
      <tr className="border-b bg-muted/40"><th colSpan={cols + 1} className="px-4 py-2 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</th></tr>
      {rows.map((r) => {
        const best = bestSet(r.cells, r.best);
        return (
          <tr key={r.label} className="border-b last:border-0">
            <th scope="row" className="px-4 py-2.5 text-left font-normal text-muted-foreground"><span className="flex items-center gap-2">{r.label}{r.note}</span></th>
            {r.cells.map((c, i) => (
              <td key={i} className={cn("num px-4 py-2.5", best.has(i) && "bg-success/10 font-semibold text-success")}>{c.text}{best.has(i) && <span className="sr-only"> (best)</span>}</td>
            ))}
          </tr>
        );
      })}
    </>
  );
}
