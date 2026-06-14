/**
 * Adds optional old_price column to products (for discount display).
 *
 *   node scripts/migrateOldPrice.js
 */
const pool = require("../db");

async function main() {
  const client = await pool.connect();
  try {
    await client.query(`
      ALTER TABLE products
        ADD COLUMN IF NOT EXISTS old_price NUMERIC(10, 2) NULL;

      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'products_old_price_nonneg'
        ) THEN
          ALTER TABLE products
            ADD CONSTRAINT products_old_price_nonneg
            CHECK (old_price IS NULL OR old_price >= 0);
        END IF;
      END $$;
    `);
    console.log("✓ products.old_price is ready.");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
