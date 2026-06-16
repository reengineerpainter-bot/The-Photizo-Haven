# App icons & splash screens for Capacitor

Place source assets here, then generate platform resources:

```bash
# 1. Add files:
#    resources/icon.png      (1024×1024, PNG)
#    resources/splash.png    (2732×2732, PNG, optional)

# 2. Install asset generator (one-time)
npm install -D @capacitor/assets

# 3. Generate Android icons & splash
npx capacitor-assets generate --android

# 4. Sync to native project
npm run cap:sync
```

Until custom icons are added, the default Capacitor launcher icon is used.
