# ChoreRights Monorepo

A pnpm-powered monorepo for the ChoreRights MVP proof-of-concept. It hosts the Next.js 14 web app, shared libraries, and database helpers aligned with the BRD/PRD specifications.

## Project Structure

```
apps/
  web/                -> Next.js 14 App Router client (Tailwind + shadcn/ui)
packages/
  lib/                -> Shared ICC utilities & Zod schemas
  db/                 -> Supabase typed client & query helpers
scripts/              -> Automation scripts for KPI exports & migration checks
docs/                 -> Architecture, product, and process documentation
```

## Prerequisites

- Node.js 18+
- pnpm 8+
- Supabase project credentials (see `.env.example`)
- Polygon Mumbai RPC endpoint

## Getting Started

1. Install dependencies:
   ```bash
   pnpm install
   ```
2. Copy environment defaults and update secrets:
   ```bash
   cp .env.example .env.local
   ```
3. Run the development server:
   ```bash
   pnpm dev
   ```
4. Open `http://localhost:3000` to view the MVP shell.

## Available Scripts

- `pnpm dev` - Start the Next.js dev server from `apps/web`.
- `pnpm build` - Build the web app for production.
- `pnpm lint` - Run ESLint across the repo.
- `pnpm format` / `pnpm format:check` - Format or verify sources with Prettier.
- `pnpm typecheck` - Type-check web + shared packages.
- `pnpm export:kpi` - Execute `/scripts/export-kpi-to-csv.ts` placeholder.
- `pnpm verify:migrations` - Execute `/scripts/verify-migration-idempotent.ts` placeholder.

## Documentation

The full documentation suite lives under [`docs/README.md`](docs/README.md) and covers architecture, business requirements, product scope, API contracts, data model, KPI plans, testing, and release processes.

## Next Steps

- Integrate Supabase auth and RLS policies defined in the data model.
- Connect blockchain interactions for ICC and license proofs.
- Flesh out automated tests and convert sample KPI data to live queries.
- Configure Husky by running `pnpm prepare` once dependencies are installed.
