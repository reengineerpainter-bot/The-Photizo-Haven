# React Native (future option)

This folder documents a **React Native / Expo** path if you later need a fully native UI instead of Capacitor's WebView approach.

## Current recommendation: Capacitor

The main app in the repo root already ships as an Android APK via Capacitor (`docs/MOBILE.md`). Use that unless you specifically need:

- Offline-first native screens without network
- Heavy native animations or platform-specific UX
- App Store policies that discourage WebView shells

## If you start React Native

A new Expo app would consume the **same REST API**:

| Endpoint | Use |
|----------|-----|
| `POST /api/auth/signup` | Registration |
| `POST /api/auth/login` | Login + MFA |
| `GET /api/giving` | Member dashboard data |
| `POST /api/giving` | Log contributions |
| `GET /api/reports/monthly` | PDF download |
| `GET /api/admin/members` | Manager matrix |

### Bootstrap (when ready)

```bash
npx create-expo-app@latest photizo-mobile --template tabs
cd photizo-mobile
```

### Shared concerns

- Store JWT in **secure storage** (`expo-secure-store`), not AsyncStorage
- Use `expo-auth-session` or cookie jar for HttpOnly cookies (or switch mobile to Bearer tokens)
- Reuse Zod schemas by publishing a shared `packages/validation` workspace package
- Match the dark + cyan design tokens from `tailwind.config.ts`

### Scaffolding checklist

- [ ] Expo Router screens: login, signup, MFA, dashboard, admin
- [ ] API client with token/cookie handling
- [ ] `expo-notifications` wired to backend
- [ ] EAS Build for APK/AAB output

No React Native code is generated yet — Capacitor covers APK needs today with zero UI rewrite.
