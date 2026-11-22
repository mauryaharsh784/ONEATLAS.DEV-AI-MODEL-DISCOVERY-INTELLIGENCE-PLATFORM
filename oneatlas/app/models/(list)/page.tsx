import type { Metadata } from "next";
import { SearchX } from "lucide-react";
import { Suspense } from "react";

import { CatalogHero } from "@/components/catalog/catalog-hero";
import { CatalogToolbar } from "@/components/catalog/catalog-toolbar";
import { FiltersSidebar } from "@/components/catalog/filters-sidebar";
import { ModelsGrid, ModelsTable } from "@/components/catalog/models-table";
import { EmptyState } from "@/components/shared/empty-state";
import { SourceNote } from "@/components/shared/data-notice";
import { Pagination } from "@/components/shared/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { parseModelQuery } from "@/lib/validation/query";
import type { SP } from "@/lib/url";
import { getFacets, listModels } from "@/services/models";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Models", description: "Search, filter and compare AI models by price, context window, capabilities and release date." };

export default async function ModelsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const q = parseModelQuery(sp);
  const [result, facets] = await Promise.all([listModels(q), getFacets()]);
  const dir = q.dir ?? (["input_price", "output_price", "name"].includes(q.sort) ? "asc" : "desc");
  const view = sp.view === "grid" ? "grid" : "table";

  return (
    <>
      <CatalogHero models={facets.total} labs={facets.labs.length} providers={facets.providers.length} />
      <div className="container-page py-6">
        <div className="grid gap-8 lg:grid-cols-[256px_minmax(0,1fr)]">
          <aside className="hidden lg:block" aria-label="Filters">
            <div className="sticky top-[calc(var(--header-height)+1rem)] max-h-[calc(100dvh-var(--header-height)-2rem)] overflow-y-auto pr-2 [scrollbar-width:thin]">
              <Suspense fallback={<Skeleton className="h-96" />}><FiltersSidebar facets={facets} /></Suspense>
            </div>
          </aside>
          <section className="min-w-0 space-y-4">
            <Suspense fallback={<Skeleton className="h-20" />}><CatalogToolbar facets={facets} total={result.total} /></Suspense>
            {result.items.length === 0 ? (
              <EmptyState icon={SearchX} title="No models match these filters" description="Try removing a filter or searching for a different name, lab, provider or model ID." />
            ) : view === "grid" ? <ModelsGrid items={result.items} /> : <ModelsTable items={result.items} sp={sp} sort={q.sort} dir={dir} />}
            <Pagination page={result.page} pageCount={result.pageCount} total={result.total} pageSize={result.pageSize} sp={sp} path="/models" />
            <SourceNote>Prices are USD per 1M tokens and context sizes are max input tokens, taken from the LiteLLM community registry. Open-weight status is inferred from whether open-model hosts serve the model. Release dates exist only where a snapshot date appears in the model ID or a public listing was observed.</SourceNote>
          </section>
        </div>
      </div>
    </>
  );
}
