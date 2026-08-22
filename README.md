# Mudra Sanchay

Mobile-first transport income, expense and farmer account management for **Radhe Krishna Transport by Dnyaneshwar Jejurkar**.

The first release records farmer crate quantities by date and trip, calculates freight automatically, tracks payments and vehicle expenses, stores market receipts, and produces printable PDF/Excel statements in English, Hindi and Marathi.

## Stack

- React 19 + TypeScript + Vite (PWA-ready web app)
- Node.js API (local server, Netlify Functions in production)
- Supabase (Auth, PostgreSQL, Storage) — schema is in `supabase/`
- pnpm workspaces monorepo
- Netlify hosting

## Monorepo

```text
mudra-sanchay/
|- apps/web                  React + Vite frontend
|- apps/api                  Node API
|- packages/shared           Types, Zod schemas, money/rate helpers
|- packages/ui               Design tokens and shared components
|- packages/i18n             English, Hindi and Marathi resources
|- supabase/                 Migrations, RLS and seed data
|- netlify/functions         Production API adapter
`- docs/                     Product LLD and architecture notes
```

## Local setup

1. Copy environment values:

```powershell
Copy-Item .env.example .env
Copy-Item .env.example apps\web\.env
Copy-Item .env.example apps\api\.env
```

2. Install dependencies (already done if you followed the project bootstrap):

```powershell
pnpm install
```

3. Start the API and web app together:

```powershell
pnpm dev
```

- Web: http://localhost:5173
- API: http://localhost:8787/api/v1/health

Without Supabase credentials the API runs in **local demo mode**: in-memory auth, farmers, trips and payments so the first vertical slice works on a laptop.

## Add Mudra Sanchay to an existing Supabase project

There is no “Add Application” button inside a Supabase project. This app lives beside your other app in the **same** project, using prefixed tables, a private storage bucket, and `app_memberships`.

1. **Create tables** — Dashboard → SQL Editor → New query. Paste and run `supabase/migrations/202608230001_shared_project_mudra.sql`. That creates `mudra_businesses`, `mudra_profiles`, `mudra_farmers`, `mudra_vehicles`, `mudra_routes`, `mudra_trips`, `mudra_crate_entries`, `mudra_payments`, `mudra_expenses`, `mudra_market_receipts`, plus `app_memberships` and RLS.
2. **Receipts bucket** — the same SQL creates private Storage bucket `mudra-receipts` with path `{userId}/{year}/{farmerId}/{file}`. Only users with `app_code = mudra_sanchay` can read or write it.
3. **Auth URLs** — Authentication → URL Configuration. Keep the other app’s URLs. Add:
   - Site URL: `https://your-mudra-sanchay.netlify.app`
   - Redirects: `http://localhost:5173/**`, the Netlify site `/**`, and `https://deploy-preview-*--your-mudra-sanchay.netlify.app/**`
4. **Local env** — Project Settings → Data API (or API). Copy Project URL and the publishable / anon key into `.env` and `apps/web/.env` as `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Never put `service_role` in the web app.
5. **Netlify env** — Site → Project configuration → Environment variables. Add the same two `VITE_` keys, then Deploys → Trigger deploy. Vite reads them at build time.
6. **Brother’s login** — after he signs up, Authentication → Users → copy the user id, then in SQL Editor:

```sql
insert into public.app_memberships (user_id, app_code, role)
values ('YOUR_BROTHER_AUTH_USER_ID', 'mudra_sanchay', 'admin');
```

Every Mudra table policy checks that membership. The other application’s tables stay untouched.

## Default business rules

- Currency is INR, stored as integer paise
- Default freight rate is INR 25 per crate (`2500` paise)
- Example: 50 crates × INR 25 = INR 1,250
- Dates use Asia/Kolkata
- Soft-delete for financial records; hard delete is not exposed in the UI

## First sprint slice

1. Register / log in
2. Complete business onboarding (vehicle + Ugaon → Pimpalgaon route)
3. Add a farmer
4. Open the farmer profile

## Scripts

| Command | Purpose |
|---|---|
| `pnpm dev` | Run API + web together |
| `pnpm build` | Production build |
| `pnpm test` | Unit tests |
| `pnpm typecheck` | TypeScript across workspaces |
| `pnpm lint` | Lint workspaces that define lint |

## Reports footer

All Rights Reserved. Developed by Roshan Mali © 2026
