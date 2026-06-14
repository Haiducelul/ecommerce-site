const pool = require("../db");

async function migrateOrderStatus() {
  let client;
  try {
    client = await pool.connect();
    console.log("[migration] Starting order status migration...");

    // First, check what status values currently exist
    const { rows: existingStatuses } = await client.query(`
      SELECT DISTINCT status FROM orders
    `);
    console.log("[migration] Current status values in database:", existingStatuses.map(r => r.status));

    // Update any existing records with old status values to new ones
    const statusMapping = {
      'pending': 'Plasată',
      'processing': 'În procesare',
      'shipped': 'Expediată',
      'delivered': 'Livrată',
      'cancelled': 'Anulată',
      'Retur / Refuzată': 'Retur',
      // Handle existing Romanian status values with different capitalization
      'expediată': 'Expediată',
      'livrată': 'Livrată',
      'în procesare': 'În procesare',
      'confirmată': 'În procesare', // Map confirmată to În procesare
    };

    let totalUpdated = 0;
    for (const [oldStatus, newStatus] of Object.entries(statusMapping)) {
      const result = await client.query(`
        UPDATE orders 
        SET status = $1 
        WHERE status = $2
      `, [newStatus, oldStatus]);
      if (result.rowCount > 0) {
        console.log(`[migration] Updated ${result.rowCount} order(s) from '${oldStatus}' to '${newStatus}'`);
        totalUpdated += result.rowCount;
      }
    }

    if (totalUpdated === 0) {
      console.log("[migration] No orders needed status updates");
    } else {
      console.log(`[migration] Total orders updated: ${totalUpdated}`);
    }

    // Drop the existing CHECK constraint
    await client.query(`
      ALTER TABLE orders 
      DROP CONSTRAINT IF EXISTS orders_status_check
    `);
    console.log("[migration] Dropped existing status constraint");

    // Add the new CHECK constraint with updated status values
    await client.query(`
      ALTER TABLE orders 
      ADD CONSTRAINT orders_status_check 
      CHECK (status IN ('Plasată', 'În procesare', 'Expediată', 'Livrată', 'Anulată', 'Retur'))
    `);
    console.log("[migration] Added new status constraint with 'Retur'");

    console.log("[migration] Order status migration completed successfully!");
  } catch (err) {
    console.error("[migration] Migration failed:", err.message);
    throw err;
  } finally {
    if (client) client.release();
    process.exit(0);
  }
}

migrateOrderStatus();
