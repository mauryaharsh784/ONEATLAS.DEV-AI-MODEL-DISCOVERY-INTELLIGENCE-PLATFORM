# Reference analysis

Compiled during Phase 1 from pages actually fetched on **2026-11-20**. Figures are as shown on those
pages at that time. Anything not fetched is listed under *Not verified* and was **not** used to justify a feature.

## Pages inspected

| Site | Pages fetched |
|---|---|
| oneatlas.dev (main product) | `/` (catalog home), `/models/openai/gpt-6.1-terra` (model detail) |
| openrouter.ai | `/` (home), `/models` (catalog) |
| routerplus.com | `/` (marketing home) |
| litellm.ai | `/` (marketing home) |

**Not verified (not fetched):** oneatlas.dev `/rankings`, `/benchmarks`, `/labs`, `/providers` and their sub-pages;
openrouter.ai `/rankings`, `/providers`, `/compare`, `/discover`, `/docs`; `app.routerplus.com` (model catalog,
playground, docs); `models.litellm.ai`. These URLs appear as links on the fetched pages, so the *pages exist*, but their
layouts are unknown to me. Phase 4 should fetch them before building rankings, labs and providers.

## 1. oneatlas.dev — the main product

**Navigation:** Models · Rankings · Benchmarks · Labs · Providers, plus a global search box ("Search models, labs, providers", ⌘K). Skip-to-content link. Footer repeats the nav and shows "Updated <date>".

**Catalog home (`/`)**
- Hero with a summary line and three links (rankings, benchmarks, labs).
- Headline counts: Models 1,118 · Labs 78 · Providers 223 · API listings 8,274.
- "Releases per month" chart (598 in 12 months) and "Capability coverage" bars (tool calling, reasoning, vision input, open weights as percentages).
- Filter bar: Search, **Lab** select (with per-lab counts), **Provider** select, **Type** select (Text 912, Image 55, Embedding 39, Video 38, Speech 28, Transcription 19, Reranking 15, Realtime 12).
- Result count ("1,118 models"), **Table / Cards** view toggle.
- Quick-toggle chips: Reasoning, Tool calling, Structured output, Vision, Open weights, 1M+ context, Free, Hide deprecated.
- Table columns: Model, Providers, Context, Output, Modalities, Reasoning, Tools, JSON, Temp, Weights, Price / 1M, Cache, Intelligence, Released, Updated. Sortable columns.
- Row anatomy: lab logo (or initials fallback) + model name linking to its page, "New" badge, `lab · model-id` subline, provider logo stack with a count, tri-state capability cells (yes / no / "?" for unknown), `Open`/`Closed`, `$in / $out` price, `Free` label, intelligence score, dates.

**Model detail (`/models/<lab>/<slug>`)**
- Breadcrumb (Models / Lab / Model), logo, name, monospace model id with **Copy id**, badges (lab, type, weights, Reasoning, Tool call, Structured output), "Compare N providers" anchor.
- Stat strip: Context, Max output, Input $, Output $, Providers (with listing count), Intelligence index.
- **Pricing** table by token type (Input, Output, Cache read, Cache write) × tier (Standard, Over-200K context, fast mode, pro mode), plus a note on the lowest price across providers.
- **Capabilities** (Reasoning with effort levels, Tool call, Structured output, Temperature, Attachments, Interleaved reasoning, Open weights, Moderated) and Input / Output modalities.
- **Benchmarks** (Intelligence, Coding, Agentic, Arena) with "Not scored" states and rank ("#5 of 51").
- **Rankings** = position on each leaderboard: Most available, Intelligence, Best value, Cheapest, Longest context, Newest.
- **Details** (lab, family, type, status, weights, knowledge cutoff, released, updated, context / input / output limits) and **API details** (first listed, tokenizer, modality string, max completion, web-search price, Hugging Face link, supported parameters).
- "Same family and lab" related-models list; **Providers** table (one row per listing: provider, provider-specific model ID, context, limits, input / output / cache prices, capability flags, updated).

Important modelling facts taken from this page: one provider can list the **same model under several IDs** (22 providers / 27 listings), and capabilities are **tri-state** (Yes / No / Unknown). Both are reflected in the OneAtlas schema.

## 2. openrouter.ai

**Navigation:** Models · Rankings · Ori (alpha) · Docs · Chat · Pricing · Dashboard · Sign in/up, search (⌘K). Footer groups: Product, Explore (Rankings, Models, Apps, Providers, Benchmarks, Tools, Discover), Company, Developer, Connect.

**Home:** headline stats (800T+ monthly tokens, 10M+ users, 600+ models); a model-category tab strip (Text, Image, Video, Speech, Transcription, Embeddings, Rerank, …) with counts; a "trending" list showing weekly tokens and week-over-week change; marketing sections on auto-routing, failover, a usage dashboard, data policy / guardrails and apps.

**Catalog (`/models`):** Filter control, a **Compare** link, "Discover Models", type tabs; each entry shows author, name, weekly token volume, **category-rank chips** (e.g. "Programming #45"), description, date, context size and `$ / M input` and `$ / M output` tokens. Variants are labelled (e.g. "Batch variant"), discounts are tagged ("50% off"), and non-token models price per unit (per second for video).

**Takeaways used:** dense list/table catalog, per-model descriptions, price expressed per million tokens, category-specific ranks, a dedicated compare entry point, variant labelling.

## 3. routerplus.com

**Navigation:** Models (links to the app subdomain) · Capacity · Docs · Blog · Playground · Sign in · Book a demo. Banner promoting free playground credits; "Backed by Y Combinator".

**Content:** positioning around routing on the customer's own evals; bring-your-own-key, regional routing, data-compliance and SLA claims; a "new models" strip; reserved-capacity messaging; FAQ; footer (Models, Featured Models, Capacity, Playground, Console, Docs, Blog).

**Takeaways used:** a **playground** as a first-class nav item with a clearly stated credit/trial model, FAQ-style trust copy, BYOK concept. The model catalog itself lives in the app subdomain and was **not** inspected.

## 4. litellm.ai

**Navigation:** AI Gateway · Docs · Product menu (AI Gateway, **Models** → `models.litellm.ai`, Python SDK, agent SDK) · Careers · Blog · Learn · Security · GitHub stars · Get started.

**Content:** open-source (MIT) gateway positioning; stated coverage "140+ providers, 1,892 models"; marketing mockups of an admin console: virtual keys, teams, spend and budgets, guardrails, **audit logs**, request logs, model/provider tables with input/output price, context and health; quick-start install snippet with copy; FAQ; plans.

**Takeaways used:** admin-console patterns (key/team/model tables, audit-log table with actor / action / object, filter bars) as the model for OneAtlas's admin dashboard and audit logs; copyable code blocks for developer tooling. The mockups are marketing illustrations, so I treat them as UI pattern references only.

## Cross-site patterns → what OneAtlas implements

| Pattern (verified on) | OneAtlas feature | Phase |
|---|---|---|
| Global search with ⌘K (OneAtlas, OpenRouter) | Header search form → `/models?q=`, ⌘K and `/` focus | 1 ✅ |
| Models / Rankings / Benchmarks / Labs / Providers primary nav (OneAtlas) | `PRIMARY_NAV` | 1 ✅ |
| Dense sortable table + card view, quick-toggle chips, lab/provider/type filters (OneAtlas) | Model discovery | 3 |
| Price per 1M tokens, context, modalities columns (all) | `formatPricePerMTok`, `formatTokens` | 1 ✅ (formatters) / 3 |
| Model detail: stats strip, pricing tiers, capabilities, provider listings, related models (OneAtlas) | Model detail pages | 3 |
| Tri-state capabilities; multiple listing IDs per provider (OneAtlas) | `SupportLevel`, `ModelProvider` | 1 ✅ (schema) |
| Leaderboard positions per category (OneAtlas, OpenRouter) | Rankings / benchmarks | 4 |
| Compare entry point (OpenRouter) | Comparison tool | 4 |
| Playground as a nav item (RouterPlus) | Playground with labelled demo mode | 5 |
| Admin tables + audit log (LiteLLM mockups) | Admin dashboard | 6 |
| Copyable IDs and code (OneAtlas, LiteLLM) | `CopyButton`, developer docs | 1 ✅ / 5 |

## Deliberate differences

OneAtlas's own copy, mark, palette and layouts are original. The brief also requires features the references do not
show in the pages I fetched (cost calculator, smart finder, accounts and collections); those are designed from the brief,
not copied from a reference.
