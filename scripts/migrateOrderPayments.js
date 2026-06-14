/**
 * Adds payment_method (default cash) and payment_status (default pending) to orders.
 *
 *   node scripts/migrateOrderPayments.js
 */
const pool = require("../db");

async function main() {
  const client = await pool.connect();
  try {
    await client.query(`
      ALTER TABLE orders
        ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) NOT NULL DEFAULT 'pending';

      ALTER TABLE orders
        ALTER COLUMN payment_method SET DEFAULT 'cash';

      UPDATE orders SET payment_method = 'cash' WHERE payment_method IS NULL;
      UPDATE orders SET payment_status = 'pending' WHERE payment_status IS NULL;

      ALTER TABLE orders
        ALTER COLUMN payment_method SET NOT NULL;
    `);
    console.log("✓ orders.payment_method and orders.payment_status are ready.");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
