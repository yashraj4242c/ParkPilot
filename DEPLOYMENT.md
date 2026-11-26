# ParkPilot — Production Deployment Guide (Vercel + Cloud PostgreSQL)

This repository is pre-configured with a Vercel-ready monorepo architecture:
- **Frontend SPA**: React 19 + TypeScript + Vite + Tailwind CSS (`dist/`)
- **Serverless API**: Node.js + Express 4 (`api/index.ts` routing to `/api/*`)
- **Database ORM**: Prisma 6 + PostgreSQL with database-level GiST exclusion constraints preventing double-bookings.

---

## Prerequisites (5 Minutes Setup)

### 1. Cloud PostgreSQL Database (Free)
Vercel serverless functions run ephemerally and need an externally reachable PostgreSQL database:
- **Recommended: [Neon.tech](https://neon.tech)** (free serverless PostgreSQL, instant setup) or **[Supabase](https://supabase.com)**.
- In Neon or Supabase, create a new project and copy your connection strings:
  - **`DATABASE_URL`**: Pooled connection string (e.g. `postgresql://...pooler.neon.tech/neondb?sslmode=require&pgbouncer=true`)
  - **`DIRECT_URL`**: Direct connection string without pooling (e.g. `postgresql://...neon.tech/neondb?sslmode=require`)

---

## Deployment Option A: GitHub + Vercel Dashboard (Recommended)

This is the standard, zero-config method for production with automatic continuous deployment:

### Step 1: Push to GitHub
1. Create a new repository on [GitHub](https://github.com/new) (e.g. `parkpilot`).
2. Run in your terminal:
   ```bash
   git remote add origin https://github.com/<your-username>/parkpilot.git
   git branch -M main
   git push -u origin main
   ```

### Step 2: Import Project in Vercel
1. Go to [Vercel Dashboard](https://vercel.com/new).
2. Click **"Import"** next to your `parkpilot` GitHub repository.
3. Keep the default settings:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build:vercel`
   - **Output Directory**: `dist`

### Step 3: Configure Environment Variables
In the Vercel project settings, add the following Environment Variables:

| Variable | Description | Example / Value |
| :--- | :--- | :--- |
| `DATABASE_URL` | Cloud PostgreSQL pooled URL | `postgresql://...pooler.neon.tech/...` |
| `DIRECT_URL` | Cloud PostgreSQL direct URL | `postgresql://...neon.tech/...` |
| `NODE_ENV` | Environment mode | `production` |
| `JWT_SECRET` | 32+ character random secret | `openssl rand -base64 32` |
| `APP_URL` | Your production Vercel URL | `https://your-project.vercel.app` |
| `ADMIN_EMAIL` | Initial Superadmin login email | `admin@yourdomain.com` |
| `ADMIN_PASSWORD` | Initial Superadmin password | `SecurePassword123!` |
| `ADMIN_NAME` | Initial Superadmin display name | `Platform Superadmin` |
| `STRIPE_SECRET_KEY` | Stripe Secret Key (optional) | `sk_live_...` or test key `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET`| Stripe Webhook Secret (optional) | `whsec_...` |
| `STRIPE_PUBLISHABLE_KEY`| Stripe Publishable Key | `pk_live_...` or `pk_test_...` |
| `RESEND_API_KEY` | Resend Email API Key (optional)| `re_...` |
| `RESEND_FROM_EMAIL` | From email sender address | `ParkPilot <bookings@yourdomain.com>` |
| `HOLD_DURATION_MINUTES`| Checkout hold timer duration | `15` |
| `ENABLE_DEV_PAYMENT_MODE` | Development payment bypass | Set to `false` in real production |

### Step 4: Click "Deploy"
Vercel will compile the frontend assets, generate the Prisma engine for Linux, configure the API routes, and provide your live production URL!

---

## Deployment Option B: Vercel CLI (Direct Terminal)

If you prefer deploying directly from your terminal:

1. **Log in to Vercel**:
   ```bash
   npx vercel login
   ```
2. **Link and deploy**:
   ```bash
   npx vercel
   ```
3. **Add production environment variables**:
   ```bash
   npx vercel env add DATABASE_URL
   npx vercel env add JWT_SECRET
   npx vercel env add NODE_ENV
   ```
4. **Deploy to production**:
   ```bash
   npx vercel --prod
   ```

---

## Applying Database Migrations & Initial Seed to Production

Once your Cloud PostgreSQL database is connected, apply the PostgreSQL GiST exclusion constraint migrations and seed the initial listings:

```bash
# 1. Apply the database schema and PostgreSQL btree_gist exclusion constraints
DATABASE_URL="<your-cloud-database-url>" npx prisma migrate deploy

# 2. Seed initial admin account and default sample parking bays
DATABASE_URL="<your-cloud-database-url>" SEED_SAMPLE_DATA="true" npx tsx prisma/seed.ts
```

---

## Stripe Webhook Setup (Production)

1. Open the [Stripe Dashboard &rarr; Webhooks](https://dashboard.stripe.com/webhooks).
2. Click **Add endpoint**.
3. Endpoint URL: `https://<your-vercel-domain>.vercel.app/api/payments/webhook`
4. Select events to listen to:
   - `checkout.session.completed`
   - `checkout.session.expired`
   - `payment_intent.payment_failed`
5. Reveal the **Signing secret** (`whsec_...`) and add it to your Vercel environment variables as `STRIPE_WEBHOOK_SECRET`.
