/**
 * scripts/archive/updateDbSchema.js
 *
 * Migrates an existing `products` table to match the current schema:
 *   - Adds `image_gallery  JSONB NOT NULL DEFAULT '[]'`
 *   - Adds `specifications JSONB NOT NULL DEFAULT '[]'`
 *   - Drops the now-redundant `product_specs` table (if it exists)
 *
 * Safe to run multiple times — all statements are idempotent.
 *
 * Usage:
 *   node scripts/archive/updateDbSchema.js
 */

const pool = require("../db");

async function migrate() {
  let client;
  try {
    client = await pool.connect();

    console.log("[migrate] Connected to database.");

    // Run everything in a single transaction so a mid-way failure leaves
    // the schema in its original state rather than partially migrated.
    await client.query("BEGIN");

    // 1. Add image_gallery column (no-op if already present)
    await client.query(`
      ALTER TABLE products
        ADD COLUMN IF NOT EXISTS image_gallery JSONB NOT NULL DEFAULT '[]'
    `);
    console.log("[migrate] ✓ image_gallery column ready.");

    // 2. Add specifications column (no-op if already present)
    await client.query(`
      ALTER TABLE products
        ADD COLUMN IF NOT EXISTS specifications JSONB NOT NULL DEFAULT '[]'
    `);
    console.log("[migrate] ✓ specifications column ready.");

    // 3. Add GIN indexes for fast JSONB containment queries (IF NOT EXISTS prevents duplicates)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_products_gallery
        ON products USING GIN (image_gallery)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_products_specs
        ON products USING GIN (specifications)
    `);
    console.log("[migrate] ✓ GIN indexes ready.");

    // 4. Drop the old product_specs table if it still exists
    //    (data was stored inline in JSONB from now on)
    await client.query(`DROP TABLE IF EXISTS product_specs CASCADE`);
    console.log("[migrate] ✓ product_specs table removed (if it existed).");

    await client.query("COMMIT");
    console.log("[migrate] Migration completed successfully.");

  } catch (err) {
    if (client) await client.query("ROLLBACK").catch(() => {});
    console.error("[migrate] Migration failed — rolled back:", err.message);
    process.exit(1);
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

migrate();
