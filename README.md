# Homiva

**Your Complete Home Companion** — an integrated home services ecosystem for
Kenya covering property discovery, short-stay bookings, home services, a home
goods marketplace, and a verified partner-company directory.

Single-page React app backed entirely by [Appwrite Cloud](https://appwrite.io)
(TablesDB, Teams, Storage, Functions, Realtime) with Paystack payments.

## Tech stack

- **Frontend:** React 18 + TypeScript + Vite 6 + Tailwind CSS + Shadcn UI (Radix)
- **Routing:** React Router 6
- **Data fetching:** TanStack Query, with an Appwrite **Realtime** subscription
  layer (`src/context/RealtimeProvider.tsx`) that invalidates query keys on row
  changes so the UI live-updates
- **Backend:** Appwrite Cloud — TablesDB (27 tables), Teams (roles), Storage
  (6 buckets), Functions
- **Auth:** passwordless **email OTP** (`account.createEmailToken` → `createSession`)
- **Maps:** MapLibre GL
- **Payments:** Paystack checkout, verified server-side in the `homiva-payments`
  Appwrite Function before any fulfillment

## Modules

| Module | What it does | Key routes |
| --- | --- | --- |
| Real estate | Buy / Rent / Airbnb tabs, search + filters, detail pages, favorites, recently viewed, inquiries | `/properties`, `/properties/:id`, `/saved`, `/recently-viewed` |
| Viewing unlock | **KES 200** Paystack fee to reveal a listing's exact address and contact details | `/properties/:id` |
| Buying | Mortgage calculator + enquiries, scheduled viewing requests | `/properties/:id` |
| Airbnb bookings | Availability calendar with booked-date blocking, guest trips, host booking management | `/trips`, `/host/bookings` |
| Home services | Cleaning (Mama Fua), plumbing, repairs — category / size / urgency pricing, photo uploads, provider acceptance, invoices | `/services`, `/services/request`, `/services/requests` |
| Marketplace | Product browsing, cart, checkout with delivery fee, stock decrement, seller orders | `/marketplace`, `/marketplace/:id`, `/cart`, `/orders` |
| Partners | Verified moving / cleaning / interior-design company directory with portfolios, on a **KES 2,000/month** subscription | `/partners`, `/partners/:id`, `/partner` |
| Listings | Owner dashboard to create/edit listings with image upload, submitted for admin approval | `/dashboard` |
| Admin | Approve/reject roles, listings, products, storefronts and partner companies; verify providers and property locations; resolve disputes; audit logs | `/admin` |
| Cross-cutting | Threaded messages, in-app notifications, reviews (property/provider/service/product), disputes | `/messages`, `/notifications` |

Feature-by-feature maturity against the PRD is tracked in
[`docs/prd-feature-audit.md`](docs/prd-feature-audit.md) — several modules are
marked *Partial* or *Ready if deployed*, so read it before assuming a flow is
production-complete.

## Prerequisites

- Node.js 20+
- An Appwrite Cloud project. This repo defaults to the existing **Homiva**
  project (`6a56af86002ae69ae1fc`, `fra` region); change `.env` to target
  another project.
- An Appwrite **API key** (Overview → Integrations → API Keys) with scopes:
  `databases.*`, `tables.*`, `collections.*`, `documents.*`, `buckets.*`,
  `files.*`, `users.*`, `teams.*`, `functions.*`.
- A Paystack account (public key for the browser, secret key for the function).

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
#    Set APPWRITE_API_KEY, VITE_PAYSTACK_PUBLIC_KEY, and optionally ADMIN_EMAIL.

# 3. Provision the Appwrite backend (database, tables, indexes, buckets, teams)
npm run setup:appwrite

# 4. (Optional) Seed sample properties so the marketplace isn't empty
npm run seed

# 5. Start the app
npm run dev
```

Open http://localhost:5173.

`npm run setup:appwrite` also registers web platforms for `localhost`,
`127.0.0.1`, `homiva.appwrite.network`, and `www.homiva.appwrite.network`.
Without the hostname you browse from registered as a platform, the browser
reports Appwrite calls as **Failed to fetch** (CORS), including photo uploads.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | Type-check (`tsc -b`) then production build |
| `npm run preview` | Serve the production build |
| `npm run setup:appwrite` | Idempotent provisioning of all tables, indexes, buckets and teams |
| `npm run setup:marketplace` | Finalize marketplace-specific columns/indexes (`scripts/finalize-marketplace-schema.ts`) |
| `npm run seed` | Insert sample property data |
| `npm run deploy:admin` | Create/update + deploy the `homiva-admin` function |
| `npm run deploy:payments` | Create/update + deploy the `homiva-payments` function |

`scripts/fix-stuck-schema.ts` is a recovery utility (no npm script) for columns
left in Appwrite's `processing` state after a bulk create — run it with
`npx tsx scripts/fix-stuck-schema.ts`.

> **Note:** `package.json` declares a `lint` script, but ESLint is not installed
> and no ESLint config exists in the repo, so `npm run lint` currently fails.
> Use `npm run build` for type checking.

### Making yourself an admin

The admin dashboard requires membership in the `admins` team.

1. Register an account in the running app.
2. Put that account's email in `.env` as `ADMIN_EMAIL` (comma-separated for
   multiple admins; `ADMIN_EMAILS` is also accepted and merged).
3. Re-run `npm run setup:appwrite` — it adds each account to the `admins` team.
   (Alternatively add users to the team from the Appwrite console.)

## Appwrite Functions

Both functions read the caller's Appwrite session and re-check authorization
server-side; the browser never holds an API key or the Paystack secret.

### `homiva-admin`

Privileged moderation actions that need an API key (team membership changes,
flipping rows to public read). Supported actions include role
approve/reject/suspend, property approve/reject, property-location
verify/reject, provider verify/unverify, partner-company
approve/reject/suspend/feature, storefront approve/reject/verify, product
approve/reject, and service-request updates. Every action writes an audit log
row.

```bash
npm run deploy:admin
```

The script creates the function if missing, sets execute permission to `Users`,
deploys [`functions/homiva-admin`](functions/homiva-admin), and enables the
dynamic execution API key scopes it needs. If you use a custom function ID, set
`VITE_APPWRITE_FUNCTION_ADMIN` and rebuild the frontend.

Until it is deployed, browsing, payments, listings and applications all work —
only admin approve/reject/suspend actions require it.

### `homiva-payments`

Verifies every Paystack transaction against the Paystack API and the matching
Appwrite record before fulfillment. Handles five payment purposes:
`viewing_fee`, `service`, `booking`, `order`, and `subscription`.

```bash
npm run deploy:payments
```

Then in Appwrite Console → Functions → `homiva-payments` → Variables add:

- key: `PAYSTACK_SECRET_KEY`
- value: your `sk_live_...` key
- secret: **enabled**

The live secret key must only ever live in the function's secret variables —
never in the app `.env`. To have the deploy script set it for you, export it for
that shell session only:

```bash
export PAYSTACK_SECRET_KEY="sk_live_..."
npm run deploy:payments
unset PAYSTACK_SECRET_KEY
```

## Role & permission model

Roles are Appwrite **Teams**. Membership activates a role; removing membership
suspends it independently of the account's other roles.

| Team | Role |
| --- | --- |
| `admins` | Administrators (assigned manually, not via application) |
| `agents` | Real estate agents |
| `landlords` | Landlords |
| `airbnb_owners` | Airbnb / short-stay owners |
| `movers` | Moving companies |
| `cleaning_companies` | Cleaning companies |
| `interior_designers` | Interior design & decor companies |

All roles except `admins` are requested through role applications, which require
supporting documents (IDs, business registration, KRA PIN, etc. — see
`ROLE_DOCUMENT_REQUIREMENTS` in `src/lib/config.ts`) and admin approval.

- Properties are created as `pending` and only become publicly readable
  (`read("any")`) once an admin approves them via `homiva-admin`.
- Row-level permissions scope favorites, recently-viewed, payments, orders,
  messages and applications to their owner (plus admins where relevant).

## Configuration

Business rules are centralized in [`src/lib/config.ts`](src/lib/config.ts):
table/bucket/function IDs, teams and applicable roles, the KES 200 viewing fee,
service categories with base fees plus size/urgency multipliers, marketplace
categories and the default KES 300 delivery fee, the KES 2,000/month
subscription plan, mortgage calculator defaults, Kenyan counties, and dispute
categories/statuses.

Storage buckets provisioned by setup: `property-images`, `avatars`,
`product-images`, `store-assets`, `service-photos`, `verification-documents`.
Each has a matching `VITE_APPWRITE_BUCKET_*` override in `src/lib/config.ts`,
though `.env.example` only lists a subset — the rest fall back to their default
slugs unless you add them.

## Project structure

```
src/
  components/        Shadcn UI primitives, layout, property/marketplace/booking components
  context/           AuthContext (session, roles, profile), CartContext, RealtimeProvider
  hooks/             TanStack Query hooks (properties, bookings, marketplace, partners, admin, ...)
  lib/               Appwrite client, config (IDs + business rules), pagination, pricing, utils
  pages/             Route pages (home, properties, services, marketplace, partners, dashboard, admin, auth)
  types/models.ts    TypeScript models for every table
scripts/
  setup-appwrite.ts             Idempotent backend provisioning
  finalize-marketplace-schema.ts Marketplace schema finalization
  fix-stuck-schema.ts           Recover columns stuck in `processing`
  seed.ts                       Sample property data
  deploy-admin-function.ts      Deploy homiva-admin
  deploy-payments-function.ts   Deploy homiva-payments
functions/
  homiva-admin/      Privileged admin actions + audit logging
  homiva-payments/   Paystack verification + fulfillment
docs/
  prd-feature-audit.md  Feature-by-feature readiness audit
```

## Codex MCP setup

This repo includes a project-scoped Codex MCP config at `.codex/config.toml` for
the Appwrite MCP server. It intentionally does not store `APPWRITE_API_KEY`;
export it in the shell that launches Codex:

```bash
export APPWRITE_API_KEY="your-appwrite-api-key"
codex
```

After changing MCP config, restart Codex and use `/mcp` to confirm the
`appwrite-api` server is connected. If Codex says the project is untrusted,
trust it so project-local `.codex/config.toml` settings load.

## Known limitations

- Contact/address gating behind the viewing fee is enforced in the UI; unlock
  rows are only created after server-side Paystack verification, but sensitive
  fields are not yet served exclusively through a function.
- Booking availability is checked server-side before fulfillment, but there is no
  transactional lock, so a race-free double-booking guarantee is missing.
- Notifications are in-app only — no email/SMS/push channels.
- Storefront plan limits are largely UI-enforced.
- Promoted listings/ads and a CMS are not implemented (only `featured` flags).
- No automated test suite or accessibility audit.
