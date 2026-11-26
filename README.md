# ParkPilot

ParkPilot is a full-stack parking marketplace and reservation platform connecting drivers with parking space owners, built with React, TypeScript, Tailwind CSS, Express, Prisma, PostgreSQL, Stripe Checkout, and Resend.

## Core Capabilities

- **Roles:** Driver, Parking Owner, and Admin with strict server-side role-based access control and `httpOnly` cookie sessions.
- **Double-Booking Prevention:** Uses PostgreSQL row-level locking (`SELECT ... FOR UPDATE`), automatic stale-hold expiry, and a `btree_gist` exclusion constraint (`booking_no_overlap_active`) on half-open `[startTime, endTime)` intervals. Adjacent reservations where one ends as another begins are allowed.
- **Online Payments:** Stripe Checkout integration with raw-body webhook signature verification, idempotent event handling, and automated refunds according to the cancellation policy. Includes a clearly labelled local development test payment flow when Stripe keys are not set.
- **Transactional Emails:** Resend integration for booking confirmations and cancellations, with safe non-crashing console logging in local development when `RESEND_API_KEY` is omitted.
- **Live Availability Updates:** Periodic polling across Search, Listing Details, Checkout, and Owner Dashboard backed by PostgreSQL as the single source of truth.

---

## Local Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Set at minimum:
- `DATABASE_URL` and `DIRECT_URL`
- `JWT_SECRET`
- `ADMIN_EMAIL` and `ADMIN_PASSWORD` (for seeding the admin account)

### 3. Start PostgreSQL (optional embedded local database)

If you do not have a local PostgreSQL server installed, you can start the included local PostgreSQL instance (listens on `127.0.0.1:5433`):

```bash
npm run db:local
```

### 4. Generate Prisma client, run migrations, and seed

```bash
npm run db:generate
npm run db:migrate:deploy
npm run db:seed
```

### 5. Run the application locally

```bash
npm run dev
```

- Frontend (Vite): `http://localhost:5173`
- Backend API (Express): `http://127.0.0.1:3001`

---

## Required Environment Variables

| Variable | Required in Prod | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Pooled PostgreSQL connection string (Neon / Supabase PgBouncer) |
| `DIRECT_URL` | Yes | Direct PostgreSQL connection string for Prisma migrations |
| `NODE_ENV` | Yes | `production` in production, `development` locally |
| `APP_URL` | Yes | Public URL of your deployed app (e.g. `https://parkpilot.vercel.app`) |
| `JWT_SECRET` | Yes | Strong random secret (minimum 16 chars, recommended 32+) |
| `SESSION_COOKIE_NAME` | Optional | Cookie name (defaults to `parkpilot_session`) |
| `ADMIN_EMAIL` | For seeding | Initial admin account email |
| `ADMIN_PASSWORD` | For seeding | Initial admin account password |
| `ADMIN_NAME` | Optional | Initial admin display name |
| `STRIPE_SECRET_KEY` | Yes (payments) | Stripe secret key (`sk_test_...` or `sk_live_...`) |
| `STRIPE_WEBHOOK_SECRET` | Yes (payments) | Stripe webhook signing secret (`whsec_...`) |
| `STRIPE_PUBLISHABLE_KEY` | Optional | Stripe publishable key |
| `RESEND_API_KEY` | Yes (emails) | Resend API key (`re_...`) |
| `RESEND_FROM_EMAIL` | Yes (emails) | Verified sender address in Resend |
| `HOLD_DURATION_MINUTES` | Optional | Unpaid hold timeout in minutes (default `15`) |
| `FREE_CANCELLATION_HOURS_BEFORE` | Optional | Hours before arrival for 100% refund (default `2`) |
| `PARTIAL_REFUND_PERCENT` | Optional | Refund percentage inside cutoff window (default `50`) |
| `ENABLE_DEV_PAYMENT_MODE` | Dev only | Set `"true"` in local dev without Stripe keys; always disabled in production |

---

## Testing & Verification Commands

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

---

## Deploying to Vercel

### 1. Provision Managed PostgreSQL
Create a hosted PostgreSQL database on **Neon** or **Supabase**:
- Use the **pooled** connection string for `DATABASE_URL` (with `?pgbouncer=true` if using Supabase/PgBouncer).
- Use the **direct** non-pooled connection string for `DIRECT_URL` so `prisma migrate deploy` can acquire advisory locks and install `btree_gist`.

### 2. Run Migrations & Seed Production Admin
From your local terminal pointing to the production database environment variables:

```bash
npx prisma migrate deploy
ADMIN_EMAIL="admin@yourdomain.com" ADMIN_PASSWORD="your-strong-password" npm run db:seed
```

> Note: In `NODE_ENV=production`, `prisma/seed.ts` only creates the admin account and skips sample development listings unless `SEED_SAMPLE_DATA=true` is explicitly set.

### 3. Configure Stripe Webhook
In the Stripe Dashboard (**Developers → Webhooks → Add endpoint**):
- Endpoint URL: `https://<your-vercel-domain>/api/payments/webhook`
- Events to listen for:
  - `checkout.session.completed`
  - `checkout.session.expired`
  - `payment_intent.payment_failed`
  - `charge.refunded`
- Copy the signing secret (`whsec_...`) into `STRIPE_WEBHOOK_SECRET` in Vercel Project Settings.

### 4. Configure Resend
In the Resend Dashboard:
- Verify your sending domain.
- Set `RESEND_API_KEY` and `RESEND_FROM_EMAIL` in Vercel Project Settings.

### 5. Deploy on Vercel
- Connect the repository to Vercel.
- Vercel uses `vercel.json` automatically (`npm run build:vercel`, static output `dist`, serverless Express entrypoint `api/index.ts` handling `/api/*`).
- Add all production environment variables in **Vercel → Project Settings → Environment Variables** and trigger deployment.
