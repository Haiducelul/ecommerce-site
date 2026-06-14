/**
 * Idempotent check: ensures the `users` table exists with the expected columns.
 * Safe to run multiple times.
 *
 *   node scripts/ensureUsersTable.js
 */
const pool = require("../db");

async function main() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE EXTENSION IF NOT EXISTS pgcrypto;

      CREATE TABLE IF NOT EXISTS users (
        id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
        name          VARCHAR(150)  NOT NULL,
        email         VARCHAR(254)  NOT NULL UNIQUE,
        password_hash TEXT          NOT NULL,
        role          VARCHAR(20)   NOT NULL DEFAULT 'customer'
                                    CHECK (role IN ('customer', 'admin')),
        phone         VARCHAR(30),
        address       TEXT,
        city          VARCHAR(100),
        created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
    `);
    console.log("✓ users table is ready.");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
