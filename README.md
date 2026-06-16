# The Photizo Haven

Secure group financial giving tracker — PWA-ready web app with manager dashboard.

## Quick Start

```bash
cp .env.example .env
# Set DATABASE_URL, JWT_SECRET, FIELD_ENCRYPTION_KEY

npm install
npm run db:push
psql $DATABASE_URL -f database/schema.sql
psql $DATABASE_URL -f database/rls_policies.sql
npm run dev
```

## What's Included

| Area | Location |
|------|----------|
| Architecture blueprint | `docs/BLUEPRINT.md` |
| PostgreSQL schema | `database/schema.sql` |
| Row-Level Security | `database/rls_policies.sql` |
| Prisma ORM | `prisma/schema.prisma` |
| JWT + RBAC middleware | `src/lib/auth/` |
| Auth API (signup/login/logout) | `src/app/api/auth/` |
| Giving API | `src/app/api/giving/` |
| Admin API | `src/app/api/admin/` |
| Member & admin UI | `src/app/(member)`, `src/app/(admin)` |

## Security Features

- JWT in HttpOnly / Secure / SameSite=Strict cookies
- MFA (TOTP) on signup and login
- RBAC: MEMBER | MANAGER | ADMIN
- IDOR prevention via group/user scoping
- AES-256-GCM field encryption for PII
- Immutable audit log
- Rate limiting on auth endpoints
- PostgreSQL RLS policies

## Giving Categories

1. Tithe
2. PCO Seed
3. Haven Dues
4. Welfare
5. Local Partnership (with monthly project description)

## Notifications

- **Lapsed**: 30+ days without a giving update
- **Outstanding**: 6+ months of consistent giving

## Android APK (Capacitor)

Build a native Android APK that wraps this app:

```bash
# Set CAPACITOR_SERVER_URL in .env to your deployed app URL
npm run cap:sync
npm run cap:open:android
```

Full guide: [`docs/MOBILE.md`](docs/MOBILE.md)  
Production deploy (Neon + Vercel): [`docs/DEPLOY.md`](docs/DEPLOY.md)  
React Native alternative notes: [`apps/mobile-rn/README.md`](apps/mobile-rn/README.md)
