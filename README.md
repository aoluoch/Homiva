# Homiva

**Your Complete Home Companion** - an integrated home services ecosystem for
discovering properties, managing homes, and (soon) requesting maintenance and
cleaning services from trusted providers.

This repository contains the **Web Application MVP - Foundation + Phase 1 (Real
Estate Marketplace)**.

## Tech stack

- **Frontend:** React + TypeScript + Vite + Tailwind CSS + Shadcn UI
- **Data/Server:** [Appwrite Cloud](https://appwrite.io) (TablesDB, Teams, Storage, Functions)
- **State/Data fetching:** TanStack Query
- **Payments:** Paystack checkout with server-side verification and fulfillment
  in the `homiva-payments` Appwrite Function.

## What's included (Phase 1)

- Single-account, multi-role identity (Normal user + applied roles: Agent,
  Landlord, Airbnb Owner, Service Provider) using Appwrite **Teams**.
- Real estate marketplace: Buy / Rent / Airbnb tabs, search + filters, property
  detail pages.
- **KES 200 viewing fee** via Paystack to unlock a property's exact address and
  contact details, with recently-viewed history and saved/favorite properties.
- Property inquiries ("Contact Homiva").
- Owner dashboard to create/manage listings with image uploads (submitted for
  admin approval).
- Basic admin dashboard to approve/reject role applications and listings, and
  view users.
- Full core database schema (all 14 PRD tables) provisioned up front so Phase
  2/3 (maintenance, cleaning) plug in without migrations.

## Prerequisites

- Node.js 20+
- An Appwrite Cloud project. This repo is pre-configured for the existing
  **Homiva** project (`6a56af86002ae69ae1fc`, `fra` region). Change the values
  in `.env` to target a different project.
- An Appwrite **API key** (Overview -> Integrations -> API Keys) with scopes:
  `databases.*`, `tables.*`, `collections.*`, `documents.*`, `buckets.*`,
  `files.*`, `users.*`, `teams.*`, `functions.*`.

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
#    Then edit .env and set APPWRITE_API_KEY, VITE_PAYSTACK_PUBLIC_KEY,
#    and optionally ADMIN_EMAIL.

# 3. Provision the Appwrite backend (database, tables, indexes, buckets, teams)
npm run setup:appwrite

# 4. (Optional) Seed sample properties so the marketplace isn't empty
npm run seed

# 5. Start the app
npm run dev
```

Open http://localhost:5173.

## Codex MCP setup

This repo includes a project-scoped Codex MCP config at
`.codex/config.toml` for the Appwrite MCP server. The config intentionally
does not store `APPWRITE_API_KEY`; export it in the shell that launches Codex:

```bash
export APPWRITE_API_KEY="your-appwrite-api-key"
codex
```

After changing MCP config, restart Codex and use `/mcp` to confirm the
`appwrite-api` server is connected. If Codex says the project is untrusted,
trust the project so project-local `.codex/config.toml` settings are loaded.

### Making yourself an admin

The admin dashboard requires membership in the `admins` team.

1. Register a normal account in the running app.
2. Put that account's email in `.env` as `ADMIN_EMAIL`.
3. Re-run `npm run setup:appwrite` - it will add the account to the `admins`
   team. (Alternatively, add the user to the `admins` team from the Appwrite
   console.)

## Deploying the admin function

Role/listing approvals run through the `homiva-admin` Appwrite Function (it
needs an API key to manage team memberships).

1. Make sure `.env` has `APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID` and an
   `APPWRITE_API_KEY` with the scopes listed above.
2. Create/update and deploy the function:
   ```bash
   npm run deploy:admin
   ```
   The script creates the **`homiva-admin`** function if it is missing, sets
   execute permission to `Users`, deploys [`functions/homiva-admin`](functions/homiva-admin),
   and enables the dynamic execution API key scopes needed by the function.
3. If you use a custom function ID in Appwrite, set
   `VITE_APPWRITE_FUNCTION_ADMIN` to that exact ID and rebuild/redeploy the
   frontend.

Until the function is deployed, browsing, payments, listings and applications
all work; only the admin approve/reject/suspend actions require it.

## Deploying the Paystack payments function

Payments run through `homiva-payments`. The browser only receives the Paystack
public key; the live secret key must be stored as an Appwrite Function **secret
variable**, never in the app `.env` file.

1. Make sure `.env` has `APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID`,
   `APPWRITE_API_KEY`, and `VITE_PAYSTACK_PUBLIC_KEY`.
2. Deploy or update the function:
   ```bash
   npm run deploy:payments
   ```
3. In Appwrite Console, open Functions -> `homiva-payments` -> Variables and add:
   - key: `PAYSTACK_SECRET_KEY`
   - value: your `sk_live_...` key
   - secret: enabled

If you need the deploy script to set the secret variable for you, export it only
for that shell session before running the command:

```bash
export PAYSTACK_SECRET_KEY="sk_live_..."
npm run deploy:payments
unset PAYSTACK_SECRET_KEY
```

The function validates each Paystack transaction server-side before fulfillment:
viewing fees, services, bookings, marketplace orders, and storefront
subscriptions are checked against Appwrite records before any row is updated.

## Role & permission model

- Roles are Appwrite **Teams**: `admins`, `agents`, `landlords`,
  `airbnb_owners`, `providers`. Membership activates a role; removing membership
  suspends it independently of other roles.
- Properties are created as `pending` and only become publicly readable
  (`read("any")`) once an admin approves them via `homiva-admin`.
- Row-level permissions scope favorites, recently-viewed, payments and
  applications to their owner (plus admins where relevant).

## Project structure

```
src/
  components/        UI primitives (Shadcn), layout, property + shared components
  context/           AuthContext (session, roles, profile)
  hooks/             TanStack Query hooks (properties, favorites, viewing, admin, ...)
  lib/               Appwrite client, config (IDs), utils
  pages/             Route pages (home, properties, dashboard, admin, auth, ...)
  types/             TypeScript models for every table
scripts/
  setup-appwrite.ts  Idempotent backend provisioning
  seed.ts            Sample property data
functions/
  homiva-admin/      Privileged admin actions (Appwrite Function)
  homiva-payments/   Paystack verification + fulfillment (Appwrite Function)
```

## Notes & limitations (MVP)

- Paystack is the active payment provider. The live secret key belongs only in
  the deployed `homiva-payments` function's secret variables.
- Contact/address gating behind the viewing fee is still checked in the UI, with
  unlock records created only after server-side Paystack verification.
# Homiva
