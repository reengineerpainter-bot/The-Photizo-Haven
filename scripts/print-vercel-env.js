/**
 * Print env vars formatted for pasting into Vercel → Settings → Environment Variables.
 * Usage: node scripts/print-vercel-env.js [production-url]
 */
const fs = require("fs");
const path = require("path");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const out = {};
  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

const root = path.join(__dirname, "..");
const env = { ...loadEnvFile(path.join(root, ".env")), ...loadEnvFile(path.join(root, ".env.local")) };

const productionUrl = process.argv[2] || env.NEXT_PUBLIC_APP_URL || "https://YOUR-APP.vercel.app";

const keys = [
  "DATABASE_URL",
  "JWT_SECRET",
  "JWT_ACCESS_EXPIRY",
  "JWT_REFRESH_EXPIRY",
  "FIELD_ENCRYPTION_KEY",
  "RATE_LIMIT_WINDOW_MS",
  "RATE_LIMIT_MAX_REQUESTS",
];

console.log("\n─── Paste into Vercel (Production + Preview + Development) ───\n");
for (const key of keys) {
  if (!env[key]) continue;
  console.log(`${key}=${env[key]}`);
}
console.log(`NEXT_PUBLIC_APP_URL=${productionUrl}`);
console.log("NODE_ENV=production");
console.log("\n─── After deploy, update local .env for APK builds ───\n");
console.log(`CAPACITOR_SERVER_URL=${productionUrl}`);
console.log(`NEXT_PUBLIC_APP_URL=${productionUrl}`);
console.log("");
