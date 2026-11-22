import { cn } from "@/lib/utils";

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col gap-0.5 px-5 first:pl-0 sm:first:pl-5">
      <dd className="num font-mono text-2xl leading-none font-semibold tracking-tight">{value.toLocaleString()}</dd>
      <dt className="text-xs text-muted-foreground">{label}</dt>
    </div>
  );
}

/** Page header for the model catalog: title, one-line purpose, and the three catalog totals read from the database. */
export function CatalogHero({ models, labs, providers, className }: { models: number; labs: number; providers: number; className?: string }) {
  return (
    <section className={cn("relative isolate overflow-hidden border-b", className)}>
      <div aria-hidden className="hero-wash absolute inset-0 -z-20" />
      <div aria-hidden className="bg-grid absolute inset-0 -z-10 opacity-60" />
      <div className="container-page flex flex-col gap-6 py-8 sm:py-10 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl space-y-2.5">
          <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">Explore AI models</h1>
          <p className="text-[15px] leading-relaxed text-pretty text-muted-foreground">
            Discover, filter and compare models from every major lab and the providers that serve them, by price, context window and capability.
          </p>
        </div>
        <dl className="flex shrink-0 divide-x divide-border/80 self-start rounded-xl border bg-card/60 py-3.5 pr-0 pl-5 backdrop-blur-sm sm:self-auto sm:pl-0" aria-label="Catalog totals">
          <Stat value={models} label="Models" />
          <Stat value={labs} label="Labs" />
          <Stat value={providers} label="Providers" />
        </dl>
      </div>
    </section>
  );
}
