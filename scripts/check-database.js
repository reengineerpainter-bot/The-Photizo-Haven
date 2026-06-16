const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const envPath = path.join(__dirname, "..", ".env");
for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
  const m = line.match(/^DATABASE_URL="(.+)"/);
  if (m) process.env.DATABASE_URL = m[1];
}

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

client
  .connect()
  .then(() =>
    client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY 1"
    )
  )
  .then((r) => {
    console.log("Tables:", r.rows.map((x) => x.table_name).join(", ") || "(none)");
    return client.end();
  })
  .catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
