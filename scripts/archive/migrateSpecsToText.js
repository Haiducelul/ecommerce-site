/**
 * scripts/archive/migrateSpecsToText.js
 *
 * Converts the `specifications` column from JSONB to plain TEXT so the
 * admin form can store free-form spec text instead of a structured array.
 *
 * Safe to run multiple times — the column-type check makes it a no-op if
 * the column is already TEXT.
 *
 * Usage:
 *   node scripts/archive/migrateSpecsToText.js
 */

const pool = require("../db");

async function migrate() {
  let client;
  try {
    client = await pool.connect();
    console.log("[migrate] Connected to database.");

    // Check current data type so we can skip if already migrated.
    const { rows } = await client.query(`
      SELECT data_type
      FROM information_schema.columns
      WHERE table_name = 'products' AND column_name = 'specifications'
    `);

    if (!rows.length) {
      console.log("[migrate] Column 'specifications' not found — nothing to do.");
      return;
    }

    const currentType = rows[0].data_type;
    if (currentType === "text") {
      console.log("[migrate] 'specifications' is already TEXT — no migration needed.");
      return;
    }

    console.log(`[migrate] Migrating 'specifications' from ${currentType} → TEXT…`);

    await client.query("BEGIN");

    // Drop the JSONB GIN index FIRST — PostgreSQL rejects ALTER COLUMN TYPE
    // while a GIN index still references the JSONB column.
    await client.query(`DROP INDEX IF EXISTS idx_products_specs`);

    // Cast existing JSONB values to text (empty array '[]' stays as '[]';
    // populated arrays become their JSON string representation).
    await client.query(`
      ALTER TABLE products
        ALTER COLUMN specifications TYPE TEXT USING specifications::text,
        ALTER COLUMN specifications SET DEFAULT ''
    `);

    // Blank out rows that only held the old empty-array default.
    await client.query(`
      UPDATE products SET specifications = '' WHERE specifications = '[]'
    `);

    await client.query("COMMIT");
    console.log("[migrate] ✓ specifications column is now TEXT with default ''.");

  } catch (err) {
    if (client) await client.query("ROLLBACK").catch(() => {});
    console.error("[migrate] Failed — rolled back:", err.message);
    process.exit(1);
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

migrate();
