/**
 * Creates the `cart_items` table (idempotent).
 *
 *   node scripts/createCartTable.js
 */
const pool = require("../db");

async function main() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE EXTENSION IF NOT EXISTS pgcrypto;

      CREATE TABLE IF NOT EXISTS cart_items (
        user_id    UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
        product_id UUID NOT NULL REFERENCES products (id) ON DELETE CASCADE,
        quantity   INT  NOT NULL DEFAULT 1 CHECK (quantity > 0),
        PRIMARY KEY (user_id, product_id)
      );

      CREATE INDEX IF NOT EXISTS idx_cart_items_user ON cart_items (user_id);
      CREATE INDEX IF NOT EXISTS idx_cart_items_product ON cart_items (product_id);
    `);
    console.log("✓ cart_items table is ready.");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
