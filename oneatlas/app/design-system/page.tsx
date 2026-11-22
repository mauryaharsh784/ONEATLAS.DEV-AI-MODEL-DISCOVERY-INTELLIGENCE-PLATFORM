import type { Metadata } from "next";
import { SearchX } from "lucide-react";

import { CopyButton } from "@/components/shared/copy-button";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { SampleBadge } from "@/components/shared/sample-badge";
import { StatCard, StatCardSkeleton } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Cpu, Server } from "lucide-react";
import { ToastDemo } from "./toast-demo";

export const metadata: Metadata = {
  title: "Design system",
  robots: { index: false, follow: false },
};

const SWATCHES = [
  ["background", "bg-background"], ["card", "bg-card"], ["muted", "bg-muted"], ["accent", "bg-accent"],
  ["primary", "bg-primary"], ["secondary", "bg-secondary"], ["success", "bg-success"], ["warning", "bg-warning"],
  ["info", "bg-info"], ["destructive", "bg-destructive"], ["border", "bg-border"], ["input", "bg-input"],
] as const;

const CHARTS = ["bg-chart-1", "bg-chart-2", "bg-chart-3", "bg-chart-4", "bg-chart-5"];

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 border-t py-8">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}

export default function DesignSystemPage() {
  return (
    <div className="container-page py-10">
      <PageHeader
        title="Design system"
        description="Tokens and components every OneAtlas page is built from. Internal reference — not indexed."
      />

      <Section title="Colour tokens" description="Semantic tokens only; switch theme in the header to check both palettes.">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {SWATCHES.map(([name, cls]) => (
            <div key={name} className="space-y-1.5">
              <div className={`${cls} h-14 rounded-lg border`} />
              <div className="font-mono text-xs text-muted-foreground">{name}</div>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          {CHARTS.map((c, i) => (
            <div key={c} className="space-y-1.5">
              <div className={`${c} h-8 w-16 rounded-md`} />
              <div className="font-mono text-xs text-muted-foreground">chart-{i + 1}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Typography">
        <div className="space-y-2">
          <p className="text-3xl font-semibold tracking-tight">Heading 1 — Geist Sans</p>
          <p className="text-xl font-semibold tracking-tight">Heading 2</p>
          <p className="text-base">Body text, 16px. Compare models by price, context and capability.</p>
          <p className="text-sm text-muted-foreground">Muted small text for hints and metadata.</p>
          <p className="font-mono text-sm">openai/example-model-id — Geist Mono</p>
          <p className="num text-sm">Tabular numerals: 1,050,000 · 128,000 · $0.0083</p>
        </div>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-2">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="link">Link</Button>
          <Button size="sm">Small</Button>
          <Button size="lg">Large</Button>
          <Button disabled>Disabled</Button>
          <Button size="icon" variant="outline" aria-label="Server"><Server /></Button>
          <CopyButton value="openai/example-model-id" label="Copy model ID" size="sm" />
        </div>
      </Section>

      <Section title="Badges" description="Capability, status and provenance labels.">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>Default</Badge>
          <Badge variant="secondary">Text</Badge>
          <Badge variant="outline">Open weights</Badge>
          <Badge variant="success">Reasoning</Badge>
          <Badge variant="info">Vision</Badge>
          <Badge variant="warning">Deprecated</Badge>
          <Badge variant="destructive">Unavailable</Badge>
          <SampleBadge />
        </div>
      </Section>

      <Section title="Form controls">
        <div className="grid max-w-md gap-3">
          <Input placeholder="Default input" />
          <Input placeholder="Invalid input" aria-invalid defaultValue="not-a-number" />
          <Input placeholder="Disabled input" disabled />
        </div>
      </Section>

      <Section title="Cards and stats">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Example stat" value="1,234" hint="Layout example, not real data" icon={Cpu} />
          <StatCard label="Another stat" value="56" icon={Server} />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Card title</CardTitle>
            <CardDescription>Card description sits under the title.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">Card content area.</CardContent>
        </Card>
      </Section>

      <Section title="Table" description="Layout example with placeholder rows — these are not catalogue entries.">
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Model</TableHead>
                <TableHead className="text-right">Context</TableHead>
                <TableHead className="text-right">Input / 1M</TableHead>
                <TableHead>Weights</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {["Example model A", "Example model B", "Example model C"].map((n, i) => (
                <TableRow key={n}>
                  <TableCell className="font-medium">{n}</TableCell>
                  <TableCell className="num text-right">{["128K", "1M", "32K"][i]}</TableCell>
                  <TableCell className="num text-right">{["$1.00", "$0.25", "Free"][i]}</TableCell>
                  <TableCell><Badge variant="outline">{i === 1 ? "Open" : "Closed"}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </Section>

      <Section title="Loading, empty and error states">
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-3 rounded-xl border p-5">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          <EmptyState icon={SearchX} title="No models match" description="Try removing a filter or searching a different term." action={<Button variant="outline" size="sm">Clear filters</Button>} />
          <ErrorState action={<Button variant="outline" size="sm">Retry</Button>} />
        </div>
      </Section>

      <Section title="Toasts" description="Sonner, themed with the same tokens.">
        <ToastDemo />
      </Section>
    </div>
  );
}
