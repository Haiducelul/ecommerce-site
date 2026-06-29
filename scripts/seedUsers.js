/**
 * scripts/seedUsers.js
 *
 * 1. Deletes the 20 previously generated mock users (identified by @example.ro emails).
 *    Admin accounts and real test accounts are NEVER touched.
 * 2. Seeds 20 new mock users with realistic Romanian names/emails via fakerRO.
 *    Password for every mock user: "test" (bcrypt-hashed).
 *
 * Usage:
 *   node scripts/seedUsers.js
 */

const bcrypt    = require("bcrypt");
const pool      = require("../db");
const { fakerRO } = require("@faker-js/faker");

// ─── Config ───────────────────────────────────────────────────────────────────

const MOCK_COUNT   = 20;
const SALT_ROUNDS  = 10;
const MOCK_PASSWORD = "test";

// Accounts that must never be deleted — admins + hand-crafted test accounts.
const PROTECTED_EMAILS = [
  "admin@techpoint.ro",
  "admin@admim.com",
  "admin@admin.com",
  "user@user.com",
  "ion@ion.ro",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Turns a Romanian name into a safe email-local part.
 * e.g. "Gheorghe Popa-Ionescu" → "gheorghe.popa-ionescu42"
 */
function toEmailLocal(firstName, lastName, idx) {
  const base = `${firstName}.${lastName}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")   // strip diacritics
    .replace(/[^a-z0-9._-]/g, ".")     // non-safe chars → dot
    .replace(/\.{2,}/g, ".")           // collapse consecutive dots
    .replace(/^\.+|\.+$/g, "");        // trim leading/trailing dots
  return `${base}${idx}`;
}

function randomRoPhoneNumber() {
  const prefixes = ["07", "07", "07", "02"];                // mostly mobile
  const prefix   = prefixes[Math.floor(Math.random() * prefixes.length)];
  const rest     = Array.from({ length: 8 }, () => Math.floor(Math.random() * 10)).join("");
  return prefix + rest;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  let client;
  try {
    client = await pool.connect();

    // ── Step 1: Delete previous mock users ──────────────────────────────────
    console.log("\n[seedUsers] Step 1 — removing previous mock users (@example.ro)…");

    const deleteResult = await client.query(
      `DELETE FROM users
       WHERE email LIKE '%@example.ro'
         AND email != ALL($1::text[])
       RETURNING email`,
      [PROTECTED_EMAILS]
    );

    if (deleteResult.rows.length === 0) {
      console.log("[seedUsers]   No @example.ro users found — nothing to delete.");
    } else {
      console.log(`[seedUsers]   Deleted ${deleteResult.rows.length} user(s):`);
      deleteResult.rows.forEach((r) => console.log(`    - ${r.email}`));
    }

    // ── Step 2: Hash the shared password once ───────────────────────────────
    console.log("\n[seedUsers] Step 2 — hashing password…");
    const passwordHash = await bcrypt.hash(MOCK_PASSWORD, SALT_ROUNDS);
    console.log("[seedUsers]   Done.");

    // ── Step 3: Generate & insert 20 Romanian mock users ────────────────────
    console.log(`\n[seedUsers] Step 3 — inserting ${MOCK_COUNT} Romanian mock users…`);

    const inserted = [];
    const usedEmails = new Set();

    for (let i = 0; i < MOCK_COUNT; i++) {
      const sex       = fakerRO.person.sexType();
      const firstName = fakerRO.person.firstName(sex);
      const lastName  = fakerRO.person.lastName(sex);
      const fullName  = `${firstName} ${lastName}`;

      // Build a unique email — append the loop index to avoid collisions
      let emailLocal = toEmailLocal(firstName, lastName, i + 1);
      let email      = `${emailLocal}@gmail.com`;

      // Extra guard: if somehow still duplicate, append more randomness
      if (usedEmails.has(email)) {
        emailLocal = `${emailLocal}${fakerRO.number.int({ min: 10, max: 99 })}`;
        email      = `${emailLocal}@gmail.com`;
      }
      usedEmails.add(email);

      const phone   = randomRoPhoneNumber();
      const city    = fakerRO.location.city();
      const address = `Str. ${fakerRO.location.street()}, nr. ${fakerRO.number.int({ min: 1, max: 120 })}`;

      await client.query(
        `INSERT INTO users (name, email, password_hash, role, phone, address, city)
         VALUES ($1, $2, $3, 'customer', $4, $5, $6)
         ON CONFLICT (email) DO NOTHING
         RETURNING id`,
        [fullName, email, passwordHash, phone, address, city]
      );

      inserted.push({ name: fullName, email, city });
    }

    console.log(`[seedUsers]   Created ${inserted.length} user(s):\n`);
    inserted.forEach(({ name, email, city }) =>
      console.log(`    ✓  ${name.padEnd(30)} ${email.padEnd(40)} ${city}`)
    );

    console.log(`\n[seedUsers] ✅  Done. Password for all mock users: "${MOCK_PASSWORD}"\n`);
  } catch (err) {
    console.error("\n[seedUsers] ❌  Error:", err.message);
    process.exit(1);
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

main();
