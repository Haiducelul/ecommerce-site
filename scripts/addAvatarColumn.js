const pool = require("../db");

async function addAvatarColumn() {
  let client;
  try {
    client = await pool.connect();
    console.log("[migration] Adding avatar_url column to users table...");

    // Check if column already exists
    const checkResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'avatar_url'
    `);

    if (checkResult.rows.length > 0) {
      console.log("[migration] Column avatar_url already exists, skipping...");
      return;
    }

    // Add the column
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN avatar_url TEXT
    `);
    console.log("[migration] Successfully added avatar_url column");
  } catch (err) {
    console.error("[migration] Migration failed:", err.message);
    throw err;
  } finally {
    if (client) client.release();
    process.exit(0);
  }
}

addAvatarColumn();
