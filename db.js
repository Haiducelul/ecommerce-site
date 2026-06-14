const { Pool } = require("pg");

const pool = new Pool({
  host:     process.env.PGHOST     || "localhost",
  port:     Number(process.env.PGPORT)     || 5432,
  database: process.env.PGDATABASE || "tech",
  user:     process.env.PGUSER     || "postgres",
  password: process.env.PGPASSWORD || "102030",

  // Keep up to 10 idle connections ready; release connections idle for > 30 s
  max:             10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

// Log every new physical connection (helpful during development)
pool.on("connect", () => {
  console.log("[db] New client connected to PostgreSQL");
});

pool.on("error", (err) => {
  console.error("[db] Unexpected error on idle client:", err.message);
});

/**
 * Run a quick SELECT 1 to verify the pool can reach the database.
 * Called once at startup; safe to remove in production.
 */
async function testConnection() {
  let client;
  try {
    client = await pool.connect();
    const { rows } = await client.query(
      "SELECT current_database() AS db, NOW() AS connected_at"
    );
    console.log(
      `[db] Connected successfully — database: "${rows[0].db}", time: ${rows[0].connected_at}`
    );
  } catch (err) {
    console.error("[db] Connection test failed:", err.message);
    process.exit(1);
  } finally {
    if (client) client.release();
  }
}

testConnection();

module.exports = pool;
