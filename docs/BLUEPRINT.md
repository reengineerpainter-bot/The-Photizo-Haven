# The Photizo Haven — Architecture Blueprint

## Overview

Production-ready PWA for tracking group financial givings across five categories: **Tithe**, **PCO Seed**, **Haven Dues**, **Welfare**, and **Local Partnership**. Built on a zero-trust security model with strict RBAC isolation between member and manager surfaces.

## Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Frontend | Next.js 14 (App Router) + Tailwind | SSR, PWA-ready, mobile-first |
| Mobile | Capacitor / React Native (phase 2) | APK from shared React codebase |
| Backend | Next.js API Routes | Unified deployment, server-side validation |
| Database | PostgreSQL 15+ | Row-Level Security, ACID, audit trails |
| ORM | Prisma | Type-safe queries, migrations |
| Auth | JWT in HttpOnly cookies + MFA (TOTP) | XSS-resistant token storage |

## Security Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client (PWA)                         │
│  Member UI ◄──► Manager Dashboard (role-gated routes)       │
└──────────────────────────┬──────────────────────────────────┘
                           │ TLS 1.3
┌──────────────────────────▼──────────────────────────────────┐
│                   Next.js Edge Middleware                    │
│  Rate limit │ CSRF │ Route RBAC │ JWT presence check        │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                    API Route Handlers                        │
│  Zod validation │ IDOR checks │ Audit log writes            │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│              PostgreSQL (RLS enforced per session)           │
│  AES-256 encrypted PII │ Immutable audit_log table          │
└─────────────────────────────────────────────────────────────┘
```

### Zero-Trust Guardrails

- **JWT**: Access + refresh tokens stored only in `HttpOnly; Secure; SameSite=Strict` cookies
- **RBAC**: `MEMBER` | `MANAGER` | `ADMIN` — enforced at middleware, API, and RLS layers
- **IDOR**: Every query scoped by `group_id` (managers) or `user_id` (members)
- **DLP**: Phone/email masked in member views; full data only in authorized admin context
- **Rate limiting**: In-memory sliding window (Redis recommended for production)
- **Audit**: Append-only `audit_log` — no UPDATE/DELETE policies

## File Structure

```
the-photizo-haven/
├── database/
│   ├── schema.sql           # Canonical DDL + indexes
│   └── rls_policies.sql     # Row-Level Security policies
├── prisma/
│   └── schema.prisma        # Prisma mirror of schema
├── src/
│   ├── app/
│   │   ├── (auth)/          # Login, signup, MFA verify
│   │   ├── (member)/        # Member dashboard & giving trackers
│   │   ├── (admin)/         # Manager portal
│   │   └── api/             # REST endpoints
│   ├── components/
│   │   ├── ui/              # Glass cards, progress bars, inputs
│   │   ├── giving/          # Category trackers
│   │   └── admin/           # Consistency matrix, reports
│   ├── lib/
│   │   ├── auth/            # JWT, RBAC, MFA, cookies
│   │   ├── crypto/          # AES-256 field encryption
│   │   ├── db/              # Prisma client
│   │   ├── validation/      # Zod schemas
│   │   ├── audit/           # Audit log writer
│   │   ├── dlp/             # PII masking utilities
│   │   └── notifications/   # Alert triggers (30-day lapse, milestones)
│   ├── middleware.ts        # Edge: rate limit + route protection
│   └── types/               # Shared TypeScript types
├── docs/
│   └── BLUEPRINT.md         # This file
└── public/
    └── manifest.json        # PWA manifest
```

## Giving Categories

| Category | Type | Tracker |
|----------|------|---------|
| Tithe | Percentage or fixed monthly | Progress bar vs target |
| PCO Seed | Partnership/faith seed | Cumulative tracker |
| Haven Dues | Fixed interval dues | Due-date indicator |
| Welfare | Community support | Monthly contribution bar |
| Local Partnership | Regional projects | Dynamic project description field |

## Notification Triggers

1. **Lapsed Member** — No contribution logged in 30+ days → warning push/in-app
2. **Outstanding Member** — Top consistency or milestone → celebratory notification

## Deployment Checklist

- [ ] Generate production secrets (`JWT_SECRET`, `FIELD_ENCRYPTION_KEY`)
- [ ] Enable TLS 1.3 on reverse proxy (nginx/Caddy)
- [ ] Apply `database/schema.sql` then `database/rls_policies.sql`
- [ ] Set `Secure` cookie flag in production
- [ ] Configure Redis for distributed rate limiting
- [ ] Enable PostgreSQL `pgcrypto` extension
- [ ] Schedule monthly report cron job
