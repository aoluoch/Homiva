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
- **Payments:** Mock viewing-fee flow now; M-PESA (Daraja) planned

## What's included (Phase 1)

- Single-account, multi-role identity (Normal user + applied roles: Agent,
  Landlord, Airbnb Owner, Service Provider) using Appwrite **Teams**.
- Real estate marketplace: Buy / Rent / Airbnb tabs, search + filters, property
  detail pages.
- **KES 200 viewing fee** (mock) to unlock a property's exact address and
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
#    Then edit .env and set APPWRITE_API_KEY (and optionally ADMIN_EMAIL).

# 3. Provision the Appwrite backend (database, tables, indexes, buckets, teams)
npm run setup:appwrite

# 4. (Optional) Seed sample properties so the marketplace isn't empty
npm run seed

# 5. Start the app
npm run dev
```

Open http://localhost:5173.

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

1. In the Appwrite console, create a Function with ID **`homiva-admin`**,
   runtime **Node 18+**, entry point `src/main.js`.
2. Deploy the code in [`functions/homiva-admin`](functions/homiva-admin).
   Easiest via the [Appwrite CLI](https://appwrite.io/docs/tooling/command-line):
   ```bash
   cd functions/homiva-admin
   appwrite deploy function
   ```
   or connect the repo / upload the folder from the console.
3. Set the function's **Execute** permission to `Users` (any logged-in user;
   the function itself enforces that the caller is an admin).
4. Provide an API key to the function - either enable a **dynamic API key**
   (recommended) or set an `APPWRITE_API_KEY` environment variable on the
   function with the scopes listed above.

Until the function is deployed, browsing, payments, listings and applications
all work; only the admin approve/reject/suspend actions require it.

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
```

## Notes & limitations (MVP)

- Payments are **mocked**: a successful KES 200 charge is simulated and recorded.
  Real M-PESA Daraja STK Push + server-side verification is a later phase.
- Contact/address gating behind the viewing fee is currently enforced in the
  UI. When M-PESA lands, this will move server-side (function-served details).
- Maintenance & Repairs and Mama Fua / Cleaning modules have database tables
  provisioned but no UI yet (Phase 2/3).
# Homiva
