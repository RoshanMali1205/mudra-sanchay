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
