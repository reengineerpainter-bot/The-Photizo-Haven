const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const env = fs.readFileSync(path.join(__dirname, "..", ".env"), "utf8");
const m = env.match(/DATABASE_URL="([^"]+)"/);
const client = new Client({
  connectionString: m[1],
  ssl: { rejectUnauthorized: false },
});

client
  .connect()
  .then(async () => {
    const group = await client.query(
      `INSERT INTO groups (name) VALUES ('Probe Group') ON CONFLICT DO NOTHING RETURNING id`
    );
    let groupId = group.rows[0]?.id;
    if (!groupId) {
      const g = await client.query(`SELECT id FROM groups LIMIT 1`);
      groupId = g.rows[0].id;
    }

    try {
      await client.query(
        `INSERT INTO users (group_id, full_name, phone_encrypted, phone_hash, email_encrypted, email_hash, password_hash, date_joined, mfa_secret, role)
         VALUES ($1, 'Test User', 'x', 'y', 'z', 'abc123', 'hash', '2024-01-01', 'secret', 'MEMBER')`,
        [groupId]
      );
      console.log("user insert without context: OK (unexpected)");
    } catch (e) {
      console.log("user insert without context FAIL:", e.message);
    }

    await client.query(`SELECT set_config('app.bootstrap', 'true', TRUE)`);
    try {
      await client.query(
        `INSERT INTO users (group_id, full_name, phone_encrypted, phone_hash, email_encrypted, email_hash, password_hash, date_joined, mfa_secret, role)
         VALUES ($1, 'Test User', 'x', 'y', 'z', 'def456', 'hash', '2024-01-01', 'secret', 'MEMBER')`,
        [groupId]
      );
      console.log("user insert with bootstrap: OK");
    } catch (e) {
      console.log("user insert with bootstrap FAIL:", e.message);
    }

    await client.end();
  })
  .catch((e) => console.error(e.message));
