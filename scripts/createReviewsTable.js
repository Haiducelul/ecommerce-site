/**
 * Creates the `reviews` table (idempotent).
 *
 *   node scripts/createReviewsTable.js
 */
const pool = require("../db");

async function main() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE EXTENSION IF NOT EXISTS pgcrypto;

      CREATE TABLE IF NOT EXISTS reviews (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
        product_id  UUID NOT NULL REFERENCES products (id) ON DELETE CASCADE,
        rating      INT  NOT NULL CHECK (rating >= 1 AND rating <= 5),
        comment     TEXT,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (user_id, product_id)
      );

      CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews (product_id);
      CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews (user_id);
    `);
    console.log("✓ reviews table is ready.");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
