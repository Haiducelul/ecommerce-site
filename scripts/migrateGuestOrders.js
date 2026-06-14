/**
 * Allows guest checkout by making orders.user_id optional.
 *
 *   node scripts/migrateGuestOrders.js
 */
const pool = require("../db");

async function main() {
  const client = await pool.connect();
  try {
    await client.query(`
      ALTER TABLE orders ALTER COLUMN user_id DROP NOT NULL;
    `);
    console.log("✓ orders.user_id is now optional (guest checkout enabled).");
  } catch (err) {
    if (err.code === "42701" || /already/.test(String(err.message))) {
      console.log("✓ orders.user_id migration already applied.");
    } else {
      throw err;
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
