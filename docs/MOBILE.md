# Mobile / APK (Capacitor)

The Photizo Haven uses **Capacitor** to wrap the Next.js app as a native Android APK. The mobile app loads your deployed Next.js server in a secure WebView (hybrid model), so all API routes, MFA, and PDF reports work without rewriting the UI.

> **Why Capacitor over React Native?** This project is already built in Next.js/React. Capacitor reuses 100% of that codebase. A React Native app would require rebuilding every screen in RN components — see `apps/mobile-rn/README.md` if you need a fully native UI later.

## Architecture

```
┌─────────────────────────────┐
│   Android APK (Capacitor)   │
│   WebView → your Next.js URL  │
│   + Status bar, splash, back  │
│   + Push notification hooks   │
└──────────────┬──────────────┘
               │ HTTPS
┌──────────────▼──────────────┐
│   Next.js server (deployed)   │
│   API · Auth · PostgreSQL     │
└───────────────────────────────┘
```

## Prerequisites

- [Node.js 18+](https://nodejs.org/)
- [Android Studio](https://developer.android.com/studio) with SDK 34+
- JDK 17+
- A **deployed** Next.js app URL (or local server for dev)

## Configuration

Add to `.env`:

```env
# Production URL the APK loads (required for real builds)
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
CAPACITOR_SERVER_URL=https://your-app.vercel.app
```

For **Android emulator** + local `npm run dev`:

```env
CAPACITOR_SERVER_URL=http://10.0.2.2:3000
```

For **physical device** on same Wi‑Fi:

```env
CAPACITOR_SERVER_URL=http://192.168.1.XXX:3000
```

Then sync:

```bash
npm run cap:sync
```

## Build APK (debug)

1. Deploy Next.js (`npm run build && npm start`) or use a hosted URL
2. Set `CAPACITOR_SERVER_URL` in `.env`
3. Sync native project:

```bash
npm run cap:sync
```

4. Open Android Studio:

```bash
npm run cap:open:android
```

5. In Android Studio: **Build → Build Bundle(s) / APK(s) → Build APK(s)**
6. APK output: `android/app/build/outputs/apk/debug/app-debug.apk`

Or from CLI (Windows):

```bash
npm run cap:build:android
```

## Release APK / Play Store

1. Create a keystore and configure signing in `android/app/build.gradle`
2. Set `CAPACITOR_SERVER_URL` to your **HTTPS** production domain
3. Remove or restrict `usesCleartextTraffic` for production
4. Build release APK/AAB in Android Studio

## App identity

| Setting | Value |
|---------|-------|
| App ID | `com.photizohaven.app` |
| App name | The Photizo Haven |
| Config | `capacitor.config.ts` |
| Android project | `android/` |

## Custom app icon

1. Add a 1024×1024 PNG to `resources/icon.png`
2. Run: `npx @capacitor/assets generate --android`
3. Run: `npm run cap:sync`

## Native features included

- Dark status bar matching app theme
- Splash screen (`#0a0a12`)
- Android back button (history → exit)
- Keyboard resize for forms
- Push notification registration stub (`src/lib/native/push-notifications.ts`)
- Safe area insets for notched devices

## Scripts

| Command | Description |
|---------|-------------|
| `npm run cap:sync` | Copy web assets + sync plugins to Android |
| `npm run cap:open:android` | Open project in Android Studio |
| `npm run cap:run:android` | Run on connected device/emulator |
| `npm run cap:build:android` | Build debug APK via Gradle |

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Blank white screen | Set `CAPACITOR_SERVER_URL` and re-run `cap:sync` |
| Can't reach localhost on device | Use your machine's LAN IP, not `localhost` |
| Cookies / login fail | Ensure HTTPS in production; same domain as API |
| Emulator localhost | Use `http://10.0.2.2:3000` |
