/**
 * Migration: extend products.category enum + add subcategory column.
 * Run with: node scripts/add-subcategory-column.js
 */
const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

const envPath = path.resolve(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([^#=\s]+)\s*=\s*(.*)$/);
    if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
  }
}

const pool = new Pool({
  host:     process.env.PGHOST     || "localhost",
  port:     Number(process.env.PGPORT) || 5432,
  database: process.env.PGDATABASE || "tech",
  user:     process.env.PGUSER     || "postgres",
  password: process.env.PGPASSWORD || "102030",
});

(async () => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(`
      ALTER TABLE products
      ADD COLUMN IF NOT EXISTS subcategory VARCHAR(50) NULL
    `);

    await client.query(`
      ALTER TABLE products DROP CONSTRAINT IF EXISTS products_subcategory_check
    `);
    await client.query(`
      ALTER TABLE products ADD CONSTRAINT products_subcategory_check
      CHECK (
        subcategory IS NULL OR subcategory IN (
          'cpu', 'placa_baza', 'gpu', 'ram', 'sursa', 'carcasa', 'stocare'
        )
      )
    `);

    await client.query(`
      ALTER TABLE products DROP CONSTRAINT IF EXISTS products_category_check
    `);
    await client.query(`
      ALTER TABLE products ADD CONSTRAINT products_category_check
      CHECK (category IN (
        'laptop', 'phone', 'tablet', 'accessories', 'desktop', 'components'
      ))
    `);

    await client.query("COMMIT");
    console.log("Migration complete: subcategory column + extended category check.");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
})().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
