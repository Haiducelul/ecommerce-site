/**
 * Creates `orders` and `order_items` tables (idempotent).
 * Safe to run multiple times on a database that does not yet have these tables.
 *
 * If you previously applied an older schema.sql with different column names,
 * drop the old tables first or migrate manually before running this script.
 *
 *   node scripts/createOrdersTables.js
 */
const pool = require("../db");

async function main() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE EXTENSION IF NOT EXISTS pgcrypto;

      CREATE TABLE IF NOT EXISTS orders (
        id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id           UUID          NOT NULL REFERENCES users (id) ON DELETE CASCADE,
        total_amount      NUMERIC(10,2) NOT NULL CHECK (total_amount >= 0),
        status            VARCHAR(30)   NOT NULL DEFAULT 'pending',
        full_name         VARCHAR(150),
        phone             VARCHAR(30),
        shipping_address  TEXT,
        created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_orders_user   ON orders (user_id);
      CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);

      CREATE TABLE IF NOT EXISTS order_items (
        id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id          UUID          NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
        product_id        UUID          NOT NULL REFERENCES products (id) ON DELETE RESTRICT,
        quantity          INTEGER       NOT NULL CHECK (quantity > 0),
        price_at_purchase NUMERIC(10,2) NOT NULL CHECK (price_at_purchase >= 0)
      );

      CREATE INDEX IF NOT EXISTS idx_order_items_order   ON order_items (order_id);
      CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items (product_id);
    `);
    console.log("✓ orders and order_items tables are ready.");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
