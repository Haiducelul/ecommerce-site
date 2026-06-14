/**
 * One-time script: set stock = 10 for every product that currently has stock = 0.
 * Run with:  node scripts/seed-stock.js
 */
const { Pool } = require("pg");

// Load .env.local manually (dotenv may not be installed as a direct dep)
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
    const { rows: before } = await client.query(
      `SELECT COUNT(*)::int AS total, SUM(CASE WHEN stock = 0 THEN 1 ELSE 0 END)::int AS zero_stock
       FROM products`
    );
    console.log(
      `Before: ${before[0].total} products total, ${before[0].zero_stock} with stock = 0`
    );

    const { rowCount } = await client.query(
      `UPDATE products SET stock = 10 WHERE stock = 0`
    );
    console.log(`Updated ${rowCount} products → stock set to 10`);

    const { rows: after } = await client.query(
      `SELECT COUNT(*)::int AS total, SUM(CASE WHEN stock = 0 THEN 1 ELSE 0 END)::int AS zero_stock
       FROM products`
    );
    console.log(
      `After:  ${after[0].total} products total, ${after[0].zero_stock} with stock = 0`
    );
  } finally {
    client.release();
    await pool.end();
  }
})().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
