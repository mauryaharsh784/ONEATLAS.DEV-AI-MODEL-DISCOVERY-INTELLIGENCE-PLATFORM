# OneAtlas — AI model discovery & intelligence platform

Live demo: https://oneatlas-dev-ai-model-discovery-int.vercel.app

A full-stack Next.js app for comparing AI models, labs and API providers. **PostgreSQL (via Prisma) is the only
data source** — every page and API reads it through a shared service layer, and every record carries provenance.

> **Honest status:** the catalog, model pages, comparison, rankings, benchmarks, labs and providers are built and tested.
> Pricing calculator, model finder, playground, developer docs, authentication, user area and admin are **not built yet**
> (see [What is not built](#what-is-not-built)). Benchmark scores are **simulated samples**, labelled as such everywhere.

## Quick start (macOS / Linux / Windows)

Requires **Node ≥ 22** and **PostgreSQL 14+**.

```bash
npm install                       # also runs `prisma generate`
# 1. create an empty database, e.g. in pgAdmin or:  createdb oneatlas
# 2. copy .env.example to .env and set DATABASE_URL (user, password, database)
npm run db:setup                  # applies the migration, then seeds the catalog (~5 s)
npm run dev                       # http://localhost:3000
```

Windows PowerShell: `copy .env.example .env`; `createdb` lives in `C:\Program Files\PostgreSQL\<ver>\bin` (or use pgAdmin).
If you already created tables from an earlier attempt, run `npm run db:reset` instead (drops, re-migrates, re-seeds).

Verify: `npm run db:check` → `http://localhost:3000/api/health` should report `"migrated": true, "models": 532`.

### Scripts

| Script | Purpose |
|---|---|
| `dev` · `build` · `start` | Next.js |
| `lint` · `typecheck` | ESLint · `tsc --noEmit` |
| `test` | 55 unit tests (Vitest) — no database needed |
| `test:integration` | 36 integration tests against the **seeded** database: real route handlers, filters/sort/pagination, schema constraints |
| `test:e2e` | Real-browser UI tests (see header of `tests/e2e/ui.mjs`; needs `puppeteer-core` + Chrome) |
| `db:setup` · `db:migrate` · `db:seed` · `db:reset` | Migrate / seed / rebuild the database |
| `data:snapshot` | Refresh `prisma/seed/data/litellm-snapshot.json` from the live registry |
| `db:gen-migration` | Regenerate `prisma/migrations/0001_init` from `schema.prisma` (see note below) |

## What is built

| Area | Routes | Notes |
|---|---|---|
| Dashboard | `/` | Live stats, trending, recent, popular, category donut, releases/month, price distribution, median price by lab, cheapest tool-calling models, popular providers, featured labs, compare shortcuts, capability coverage, 6 Recharts charts |
| Global search | header, `/` | Live dropdown (`/api/search`), ↑/↓/Enter, ⌘K or `/` to focus, groups models/labs/providers |
| Model catalog | `/models` | Redesigned (see [UI redesign](#ui-redesign)): header with live totals, table + grid views, URL-backed collapsible filter sidebar (mobile drawer) with named chips, sortable sticky-header table, debounced search, sort/page-size menus, pagination, compare checkboxes with a floating compare bar |
| Model detail | `/models/<lab>/<slug>` | Stats strip, per-provider pricing with copyable provider model IDs and tiers, capabilities (yes/no/unknown), modalities, sample benchmark bars, specifications, related models, docs links |
| Compare | `/compare?ids=…` | 2–5 models, search-to-add, remove, best-value highlighting, share link, floating tray from anywhere |
| Rankings | `/rankings` | Overall / Intelligence / Coding / Reasoning / Vision / Agentic / Performance, top 10/20/50, score breakdown, chart |
| Benchmarks | `/benchmarks`, `/benchmarks/<slug>` | 9 benchmark definitions with methodology, cross-model chart, leaderboards |
| Labs | `/labs`, `/labs/<slug>` | 18 labs, search/sort, open vs closed counts, latest releases, serving providers, model table |
| Providers | `/providers`, `/providers/<slug>` | 75 providers, type filter, lowest price, per-provider model listing with prices and IDs |
| REST API | `/api/*` | models, models/:id, providers(/:slug), labs(/:slug), rankings, benchmarks(/:slug), search, stats, facets, health |

All API responses use `{ ok, data, meta? }` / `{ ok:false, error:{code,message,details?} }`, Zod validation, central error mapping
(unknown errors are opaque 500s), cache headers, and an in-memory rate limiter (60/min search, 120/min others).

## UI redesign

The Models catalog and the visual system were redesigned without changing routes, API contracts or data sources.

- **Theme:** deeper near-black dark theme with an indigo/violet accent and low-contrast borders (`app/globals.css`); light theme still supported.
- **Navbar:** compact, blurred, with an active-section indicator (`components/shared/site-nav.tsx`, `site-header.tsx`).
- **Catalog:** `components/catalog/` — `catalog-hero`, `catalog-toolbar`, `filters-sidebar`, `models-table` (table, mobile list and card grid), `clickable-row`, `model-parts`, `compare-controls` (checkbox, button and floating tray), `icons` (capability/modality tooltips).
- **Filter state:** `hooks/use-query-state.ts` keeps an optimistic copy of the URL, so checkboxes respond instantly and quick consecutive clicks no longer overwrite each other.
- **Data:** list rows now include the model `description` (read-only column that already existed).
- **Detail page:** same header band and stat strip styling as the catalog.
- **Loading:** a catalog-shaped skeleton (`CatalogSkeleton`).

## Data — what is real and what is not

| Data | Source | Status |
|---|---|---|
| Models, prices, context/output limits, capability flags, provider listings | [LiteLLM community registry](https://github.com/BerriAI/litellm) (`model_prices_and_context_window.json`), committed as `prisma/seed/data/litellm-snapshot.json` | **Real**, community-maintained; a snapshot, not a live quote |
| Lab and provider profiles | Hand-curated (`services/ingest/reference.ts`) | Real, conservative; unknown facts left empty |
| Release dates | Parsed from model-ID snapshot suffixes (e.g. `-20251001`), plus 12 dates observed on oneatlas.dev / openrouter.ai on 2026-11-20 | Real but partial — only ~70 of 532 models have a date; may be a snapshot date, not first release |
| **Benchmark scores** | Generated by `services/ingest/benchmarks.ts` from price tier, release year and capabilities + seeded noise | **Simulated.** `isSimulated = true`, `source = SAMPLE`, "Sample data" badge on every display |
| Open-weight flag | **Inferred**: listed by ≥ 2 open-model hosts (Together, Fireworks, Groq …); DeepInfra/Replicate excluded because they proxy proprietary models; OpenAI/Anthropic only for `gpt-oss*` | Heuristic, shown as "(inferred)"; not a licence check |
| Third-party provider ↔ model matching | Canonical-slug match (provider prefixes, regions, snapshot dates stripped) | Heuristic; can mis-match renamed variants |
| "Context window" | `max_input_tokens` from the registry | Not the same as total context for every provider |
| "Trending" / "Popular" | Availability-based (provider count among recent / all models) | No usage telemetry exists |
| Logos | Generated initials avatars | No logo assets bundled |

Ingestion is an adapter (`services/ingest/litellm.ts`: pure, unit-tested) + orchestrator (`prisma/seed/index.ts`) + derived-column
recompute (`services/ingest/summary.ts`). Every model/listing/price row stores `source`, `sourceUrl`, `isSimulated`; each seed writes an `IngestionRun`.

## Architecture

```
app/                    routes (App Router) + app/api/* handlers — thin: validate → service → envelope
services/               all database reads (models, overview, rankings, benchmarks, directory) + services/ingest/*
lib/validation/         Zod schemas shared by pages and APIs (one parser for URL params)
components/{ui,shared,catalog,charts,search}   shadcn-style primitives and feature components
prisma/                 schema.prisma, migrations/0001_init, seed/
tests/{unit,integration,e2e}
```
Pages are server components that call the same services as the API; interactive pieces (filters, search, compare tray) are small
client islands whose state lives in the URL (filters) or `localStorage` (compare selection).

## Schema

20 tables: the 18 required (User, Model, Lab, Provider, ModelProvider, Pricing, Benchmark, ModelBenchmark, Capability,
ModelCapability, Favorite, Collection, CollectionModel, Comparison, ComparisonModel, ModelRelease, AuditLog, `ApiUsage`) plus
`ModelView` and `IngestionRun`. Highlights: listing-vs-model split (a provider can list one model under several IDs), tier-aware
pricing with history, tri-state capabilities, provenance columns, `Decimal` money, FK `Restrict` on lab/provider and `Cascade` on
model children, 79 indexes incl. GIN on modality arrays. User-owned tables (favorites, collections, saved comparisons, audit log)
exist in the schema but have no UI yet.

> **Migration note.** `prisma/migrations/0001_init/migration.sql` was produced by `scripts/generate-migration.ts` (it follows Prisma's
> naming conventions) because Prisma's migration engine could not be downloaded where this was built. It was applied to PostgreSQL 16
> and exercised by the integration tests, but never compared by `prisma migrate dev`. On your machine run `npx prisma migrate dev`
> once: if it reports drift, accept the generated follow-up migration.

## Key decisions

- Cache Components is **off** (scaffold default): every DB read would need `<Suspense>`, and Auth.js v5 compatibility is unproven. Pages are `force-dynamic`.
- Loading skeletons live in route groups that exclude detail pages, because `loading.tsx` would flush a 200 before `notFound()` runs. Missing resources return real 404s.
- Prisma 7.10.1 (stable) with `@prisma/adapter-pg`; npm's `latest` is currently an 8.0 RC.
- Tailwind via `@tailwindcss/postcss`; fonts self-hosted (`geist`); chart animation disabled for deterministic rendering.
- shadcn/ui components are hand-written to the standard structure (`components.json` included).

## Testing — what was actually run

| Suite | Result |
|---|---|
| `tsc --noEmit`, `eslint` | clean |
| Unit (8 files) | 55 passing — adapter, slug normalisation, query validation, rate limiter, benchmark simulator, formatters, env, API helpers |
| Integration (2 files) | 36 passing against the seeded PostgreSQL — search/filter/sort/pagination assertions, detail 404s, comparison, rankings order, labs/providers, rate-limit 429, SQL-injection input, FK/unique/cascade constraints, "all benchmark scores are simulated" |
| HTTP smoke | 43 checks over every page and endpoint on the production build, incl. 404 status codes |
| Real browser (headless Chrome 153) | 23 UI flows passing, 0 console/page errors: search dropdown + keyboard, filters, sort, pagination, grid toggle, compare tray → page → add/remove/share, theme persistence, mobile drawer and filter drawer, no horizontal overflow at 390 px on 10 pages |
| Accessibility | 32 text/surface colour pairs meet WCAG AA in light and dark (computed); landmarks, skip link, `aria-sort`, labelled controls. Not audited with a screen reader |

Bugs found and fixed by this testing: false "open-weights" on proprietary models; `sr-only` text widening the compare page on
mobile; 200-instead-of-404 on missing resources; `set-state-in-effect` lint errors; misattributed lab for aggregator-hosted models;
simulated throughput exceeding its scale; chart label collisions.

## What is not built

Pricing page / token cost calculator, Smart Model Finder, Playground, developer docs & code samples, authentication, accounts,
favorites / collections / saved comparisons UI, admin dashboard (CRUD, CSV/JSON import, audit log UI), Playwright suite (a
puppeteer-based script is provided instead), distributed rate limiting (the limiter
is per-process; use Redis/Upstash on Vercel). `npm audit` reports 3 high findings, all one ReDoS advisory in `effect`, pulled in by
the Prisma CLI (build-time only).

## Deployment (Vercel + Neon)

1. **Neon:** create a project. In *Connect*, copy two strings: pooling **on** (host contains `-pooler`) and pooling **off** (direct).
2. **Load the database once, from your own machine** (set both variables to the *direct* string in that terminal only):
   ```powershell
   $env:DATABASE_URL="<neon direct string>"
   $env:DIRECT_URL="<neon direct string>"
   npm run db:setup
   ```
3. **GitHub:** push the repo (`.env` is git-ignored and must stay that way).
4. **Vercel:** import the repo and set environment variables — values pasted **without quotes**:
   `DATABASE_URL` = pooled string, `DIRECT_URL` = direct string, `DATABASE_POOL_MAX` = `3`, later `NEXT_PUBLIC_APP_URL` = your live URL. Redeploy after any change.
5. **Check:** `/api/health` should report `"database":"up"`, `"migrated":true`, `"models":532`.

Troubleshooting: `/api/health` OK but pages show "Something went wrong" means a server render failed; production hides the message
(React error #441). Read the real error in Vercel → Logs (Runtime, level Error), or reproduce locally with the Neon strings set in the
terminal (`npm run dev` prints the full error). Never paste real connection strings or passwords into chats, issues or commits; reset the
Neon password if one leaks.

---
Built with ❤ by Harsh Vardhan Maurya.

