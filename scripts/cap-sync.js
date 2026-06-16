/**
 * Syncs Capacitor with env from .env / .env.local
 * Usage: node scripts/cap-sync.js [android|ios]
 */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
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
    if (!process.env[key]) process.env[key] = value;
  }
}

const root = path.join(__dirname, "..");
loadEnvFile(path.join(root, ".env"));
loadEnvFile(path.join(root, ".env.local"));

const platform = process.argv[2] || "android";
const serverUrl =
  process.env.CAPACITOR_SERVER_URL || process.env.NEXT_PUBLIC_APP_URL || "";

console.log(`[cap-sync] server.url = ${serverUrl || "(local shell only)"}`);

execSync(`npx cap sync ${platform}`, {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});
