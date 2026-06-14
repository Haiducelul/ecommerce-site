/**
 * Replaces the English status CHECK on `orders` with the 5 Romanian admin statuses.
 *
 *   node scripts/archive/migrateOrderStatuses.js
 */
const pool = require("../db");

const NEW_STATUSES = [
  "în procesare",
  "confirmată",
  "expediată",
  "livrată",
  "anulată",
];

async function main() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(`
      ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
    `);

    // Map legacy English values to Romanian equivalents
    await client.query(`
      UPDATE orders SET status = 'în procesare' WHERE status = 'pending';
      UPDATE orders SET status = 'în procesare' WHERE status = 'processing';
      UPDATE orders SET status = 'confirmată'    WHERE status = 'confirmed';
      UPDATE orders SET status = 'expediată'     WHERE status = 'shipped';
      UPDATE orders SET status = 'livrată'       WHERE status = 'delivered';
      UPDATE orders SET status = 'anulată'       WHERE status = 'cancelled';
    `);

    const inList = NEW_STATUSES.map((s) => `'${s.replace(/'/g, "''")}'`).join(", ");
    await client.query(`
      ALTER TABLE orders
        ALTER COLUMN status SET DEFAULT 'în procesare',
        ADD CONSTRAINT orders_status_check
          CHECK (status IN (${inList}));
    `);

    await client.query("COMMIT");
    console.log("✓ Order status constraint updated to Romanian values.");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
