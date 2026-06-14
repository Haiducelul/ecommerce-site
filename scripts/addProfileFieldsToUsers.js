/**
 * Adds profile columns to `users` if missing (safe to run multiple times).
 *
 *   node scripts/addProfileFieldsToUsers.js
 */
const pool = require("../db");

async function main() {
  const client = await pool.connect();
  try {
    await client.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS phone VARCHAR,
        ADD COLUMN IF NOT EXISTS address TEXT;
    `);
    console.log("✓ users.phone and users.address are ready.");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
