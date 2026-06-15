
# ReachAI — AI-Native Marketing CRM

## Important stack note

Your brief specifies Vite + React Router + separate Express backend + Render/Vercel + Prisma/Postgres. Lovable projects run on a different (but equivalent) stack, and I'll build to that so everything actually runs in your preview and deploys with one click:

| You asked for | What I'll use (equivalent) |
|---|---|
| React + Vite + React Router | TanStack Start (React 19 + Vite 7, file-based routing) |
| Tailwind + shadcn + Recharts + Axios | Tailwind v4 + shadcn + Recharts (already installed) |
| Express backend | TanStack server routes + `createServerFn` (same Node/Express semantics, same project) |
| PostgreSQL + Prisma | Lovable Cloud (managed Postgres + auth + storage) |
| Gemini API | Lovable AI Gateway → `google/gemini-3-flash-preview` (no API key needed, structured JSON output supported) |
| Separate Channel Simulator service | Second app surface inside the project at `/api/public/simulator/*` — independently callable over HTTP, decoupled from CRM logic, talks back via `/api/public/callback`. Functionally identical to a separate Render service. |
| Vercel + Render deploy | One-click Lovable publish (both "services" deploy together) |

Everything else in your brief — schemas, seed data, AI segmentation, AI campaign generation, simulator probabilities, callbacks, dashboards, assistant, docs — I'll build exactly as specified.

If you actually need two *physically separate* repos on Vercel + Render with Prisma, say so and I'll instead generate a downloadable codebase you run locally (no live preview).

## What I'll build

### 1. Data layer (Lovable Cloud / Postgres)
Tables with RLS + grants: `customers`, `orders`, `campaigns`, `communications`. Schema matches your spec exactly. Seed migration generates **1000 realistic Indian customers** (names, cities, phones, age, gender) and **5000 orders** across categories (skincare, coffee, apparel, electronics, wellness), distributed to produce active / inactive / high-value / low-value cohorts.

### 2. CRM backend (server functions + routes)
- `getDashboardStats`, `listCustomers` (search/filter/sort/paginate), `getCustomer` (profile + history + trend)
- `segmentFromNaturalLanguage` — sends NL prompt to Gemini with a strict JSON schema, returns `{filters, audience, count, estRevenue}`
- `generateCampaign` — objective → `{title, subject, copy, cta, channel}` via Gemini
- `sendCampaign` — materializes `communications` rows, fans out HTTP POSTs to the Channel Simulator
- `getCampaignAnalytics` — funnel, trends, AI insights
- `assistantChat` — floating assistant with tool-calling over the above

### 3. Channel Simulator (independent surface)
- `POST /api/public/simulator/send` — accepts `{customerId, campaignId, channel, message}`, simulates Delivered (90%) → Opened (70%) → Clicked (25%), with channel-specific tweaks (WhatsApp > Email > SMS)
- After randomized delay, calls back `POST /api/public/callback` to update communication status
- Lives in `src/routes/api/public/simulator/` — no shared imports with CRM code, communicates only over HTTP

### 4. Frontend (TanStack Start)
- `/` Dashboard — KPI cards, revenue chart, channel mix, **AI Recommendations panel** (live Gemini analysis)
- `/customers` — table with search, filters (city, gender, segment, spend range), sort, pagination
- `/customers/$id` — profile, purchase history, spend trend (Recharts), segment badge
- `/segments` — natural-language audience builder → JSON filters → live audience preview
- `/campaigns` — list + create (AI generator) + editable draft + Send
- `/campaigns/$id` — funnel chart, conversion trends, AI insights
- Floating **AI Assistant** drawer on every page

### 5. Design system
Modern SaaS dashboard look: tight typography, soft shadows, gradient accents, semantic tokens in `src/styles.css`. No purple. Light, clean, startup feel.

### 6. Docs (in `/docs` + README)
- Architecture diagram (Mermaid): current (monolith + simulator) vs future (Kafka, Redis, queue workers, microservices) with tradeoffs
- DB schema, API reference, AI workflow, deployment, future improvements
- Demo talking points

## Build order
1. Enable Lovable Cloud + create migration (schema, grants, RLS, seed 1000+5000)
2. Design system + app shell + nav
3. Dashboard + customers list/profile
4. Segment builder (Gemini structured output)
5. Campaign generator + send pipeline
6. Channel Simulator routes + callback
7. Campaign analytics + AI insights
8. Floating AI assistant
9. Docs + README + architecture diagram

## Tradeoffs I'm making for you
- **Auth**: skipped (single-marketer demo). Easy to add later.
- **Seed size**: 1000/5000 as requested; generated in one migration.
- **Simulator latency**: 1–8s randomized via `setTimeout` + `waitUntil`-style detached promise, not a real queue. Future: Kafka + workers (covered in docs).

Reply **go** to build, or tell me what to change (e.g. "use real separate Express repo instead", "add auth", "smaller seed").
