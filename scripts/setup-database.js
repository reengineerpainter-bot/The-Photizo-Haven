/**
 * Apply database/schema.sql and database/rls_policies.sql to PostgreSQL (Neon).
 * Usage: node scripts/setup-database.js
 * Requires DATABASE_URL in .env or environment.
 */
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

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

async function runSqlFile(client, filePath) {
  const sql = fs.readFileSync(filePath, "utf8");
  const name = path.basename(filePath);
  console.log(`[db] Running ${name}...`);
  await client.query(sql);
  console.log(`[db] ✓ ${name}`);
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || databaseUrl.includes("USER:PASSWORD")) {
    console.error(
      "[db] Set DATABASE_URL in .env to your Neon connection string first."
    );
    console.error("     See docs/DEPLOY.md Step 1.");
    process.exit(1);
  }

  const client = new Client({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes("localhost") ? false : { rejectUnauthorized: false },
  });

  await client.connect();
  console.log("[db] Connected to PostgreSQL");

  try {
    await runSqlFile(client, path.join(root, "database", "schema.sql"));
    await runSqlFile(client, path.join(root, "database", "rls_policies.sql"));
    console.log("[db] Database ready. Run: npm run db:generate");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("[db] Setup failed:", err.message);
  process.exit(1);
});
