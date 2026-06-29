/**
 * scripts/createAdmin.js
 *
 * One-time script to seed a single admin user into the `users` table.
 *
 * Usage:
 *   node scripts/createAdmin.js
 *
 * Override defaults with env vars:
 *   ADMIN_NAME="John" ADMIN_EMAIL="john@buildtech.ro" ADMIN_PASSWORD="secret" node scripts/createAdmin.js
 */

const bcrypt = require("bcrypt");
const pool   = require("../db");

// ── Configuration ────────────────────────────────────────────────────────────

const ADMIN_NAME     = process.env.ADMIN_NAME     || "Admin";
const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    || "admin@admin.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin";
const SALT_ROUNDS    = 12;

// ── Script ───────────────────────────────────────────────────────────────────

async function createAdmin() {
  let client;
  try {
    client = await pool.connect();

    // verificare daca exista un admin cu acest email
    const existing = await client.query(
      "SELECT id FROM users WHERE email = $1",
      [ADMIN_EMAIL]
    );

    if (existing.rows.length > 0) {
      console.log(`[createAdmin] User "${ADMIN_EMAIL}" already exists — nothing to do.`);
      return;
    }

    // hasurare parola
    console.log("[createAdmin] Hashing password…");
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, SALT_ROUNDS);

    // Insert the admin row
    const result = await client.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, 'admin')
       RETURNING id, name, email, role, created_at`,
      [ADMIN_NAME, ADMIN_EMAIL, passwordHash]
    );

    const user = result.rows[0];
    console.log("[createAdmin] Admin user created successfully:");
    console.log(`  ID:      ${user.id}`);
    console.log(`  Name:    ${user.name}`);
    console.log(`  Email:   ${user.email}`);
    console.log(`  Role:    ${user.role}`);
    console.log(`  Created: ${user.created_at}`);

  } catch (err) {
    console.error("[createAdmin] Failed:", err.message);
    process.exit(1);
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

createAdmin();
