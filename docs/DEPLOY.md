# Deploy: Neon + Vercel

Step-by-step guide to put **The Photizo Haven** online so the web app and Android APK can reach it.

Your local `.env` is already wired with production-grade secrets. After Neon gives you a database URL, you paste the same values into Vercel.

---

## What’s already done locally

| Item | Location |
|------|----------|
| JWT + encryption secrets | `.env` (gitignored) |
| DB setup script | `npm run db:setup` |
| Vercel env printer | `npm run vercel:env` |
| Prisma client on Vercel builds | `postinstall` → `prisma generate` |

---

## Step 1 — Create Neon PostgreSQL

1. Go to [console.neon.tech](https://console.neon.tech) and sign up (GitHub login works).
2. Click **New Project**.
   - Name: `photizo-haven`
   - Region: pick the closest to your users (e.g. `US East` or `EU West`)
3. On the project dashboard, open **Connection Details**.
4. Copy the **connection string** (pooled is fine for serverless/Vercel).
   - It looks like:
     ```
     postgresql://neondb_owner:xxxx@ep-xxxx.us-east-1.aws.neon.tech/neondb?sslmode=require
     ```

### Wire DATABASE_URL locally

Open `.env` and replace the placeholder:

```env
DATABASE_URL="postgresql://neondb_owner:YOUR_PASSWORD@ep-xxxx.region.aws.neon.tech/neondb?sslmode=require"
```

### Create tables + RLS on Neon

From the project folder:

```bash
npm run db:setup
```

You should see:

```
[db] Connected to PostgreSQL
[db] Running schema.sql...
[db] ✓ schema.sql
[db] Running rls_policies.sql...
[db] ✓ rls_policies.sql
[db] Database ready.
```

**Troubleshooting:** If `uuid-ossp` fails on Neon, edit `database/schema.sql` line 5 — Neon prefers `gen_random_uuid()` (already used in tables). You can comment out `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`.

---

## Step 2 — Push code to GitHub

Vercel deploys from Git. If you don’t have a repo yet:

```bash
git init
git add .
git commit -m "Initial commit — Photizo Haven"
```

Create a new repo on [github.com/new](https://github.com/new) (name e.g. `the-photizo-haven`), then:

```bash
git remote add origin https://github.com/YOUR_USERNAME/the-photizo-haven.git
git branch -M main
git push -u origin main
```

---

## Step 3 — Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and sign up with GitHub.
2. Click **Add New… → Project**.
3. Import your `the-photizo-haven` repository.
4. Framework preset should auto-detect **Next.js**. Leave defaults:
   - Build Command: `next build`
   - Output: default
5. Expand **Environment Variables** and add each of these (copy from your `.env` or run `npm run vercel:env`):

| Name | Value |
|------|--------|
| `DATABASE_URL` | Your Neon connection string |
| `JWT_SECRET` | From `.env` |
| `JWT_ACCESS_EXPIRY` | `15m` |
| `JWT_REFRESH_EXPIRY` | `7d` |
| `FIELD_ENCRYPTION_KEY` | From `.env` |
| `NEXT_PUBLIC_APP_URL` | `https://YOUR-PROJECT.vercel.app` (use the URL Vercel shows, or your custom domain later) |
| `NODE_ENV` | `production` |
| `RATE_LIMIT_WINDOW_MS` | `60000` |
| `RATE_LIMIT_MAX_REQUESTS` | `100` |

   Apply to **Production**, **Preview**, and **Development**.

6. Click **Deploy**. First build takes ~2–3 minutes.

7. When done, open the deployment URL (e.g. `https://the-photizo-haven.vercel.app`).

### Verify production

- Landing page loads
- `/signup` creates an account (hits Neon via Prisma)
- `/login` works after MFA setup

If signup fails with a DB error, re-run `npm run db:setup` with the same `DATABASE_URL` you put in Vercel.

---

## Step 4 — Point the Android APK at production

After Vercel gives you a live HTTPS URL, update `.env`:

```env
NEXT_PUBLIC_APP_URL="https://the-photizo-haven.vercel.app"
CAPACITOR_SERVER_URL="https://the-photizo-haven.vercel.app"
```

Re-print env for reference:

```bash
npm run vercel:env https://the-photizo-haven.vercel.app
```

Sync Capacitor and build:

```bash
npm run cap:sync
npm run cap:open:android
```

In Android Studio: **Build → Build Bundle(s) / APK(s) → Build APK(s)**.

---

## Step 5 — Optional: Vercel CLI (deploy from terminal)

```bash
npx vercel login
npx vercel link
npx vercel env pull .env.vercel   # optional: pull remote env
npx vercel --prod
```

---

## Environment variable reference

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | Yes | Neon PostgreSQL |
| `JWT_SECRET` | Yes | Signs auth cookies (64+ bytes) |
| `FIELD_ENCRYPTION_KEY` | Yes | AES-256 for phone/email at rest |
| `NEXT_PUBLIC_APP_URL` | Yes | Public app URL (cookies, links) |
| `NODE_ENV` | Yes | `production` on Vercel |
| `CAPACITOR_SERVER_URL` | APK only | WebView target (local `.env` only) |
| `JWT_ACCESS_EXPIRY` | No | Default `15m` |
| `JWT_REFRESH_EXPIRY` | No | Default `7d` |
| `RATE_LIMIT_*` | No | API throttling |

**Never commit `.env` to Git.** Secrets are in `.gitignore`.

---

## Neon ↔ Vercel integration (alternative)

Neon offers a Vercel integration that auto-injects `DATABASE_URL`:

1. Neon dashboard → **Integrations** → **Vercel**
2. Connect your Vercel project
3. Still add `JWT_SECRET`, `FIELD_ENCRYPTION_KEY`, and `NEXT_PUBLIC_APP_URL` manually in Vercel

---

## Quick command cheat sheet

```bash
# After Neon URL is in .env
npm run db:setup

# Print vars for Vercel dashboard
npm run vercel:env https://your-app.vercel.app

# Local production test
npm run build && npm start

# APK after deploy
npm run cap:sync
```
