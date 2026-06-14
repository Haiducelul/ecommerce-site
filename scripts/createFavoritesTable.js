/**
 * Creates the `favorites` table (idempotent).
 *
 *   node scripts/createFavoritesTable.js
 */
const pool = require("../db");

async function main() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE EXTENSION IF NOT EXISTS pgcrypto;

      CREATE TABLE IF NOT EXISTS favorites (
        user_id    UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
        product_id UUID NOT NULL REFERENCES products (id) ON DELETE CASCADE,
        PRIMARY KEY (user_id, product_id)
      );

      CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites (user_id);
      CREATE INDEX IF NOT EXISTS idx_favorites_product ON favorites (product_id);
    `);
    console.log("✓ favorites table is ready.");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
