const pool = require("../db.js");

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS is_two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE;
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS two_factor_tokens (
        id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        email       TEXT        NOT NULL,
        token       TEXT        NOT NULL,
        expires_at  TIMESTAMPTZ NOT NULL,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_2fa_tokens_email ON two_factor_tokens(email);
    `);
    console.log("2FA migration completed successfully.");
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
