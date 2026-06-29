/**
 * POST /api/auth/oauth-session
 *
 * Bridge between NextAuth OAuth session and our custom JWT session system.
 * Called from /oauth-callback after a successful Google/Yahoo sign-in.
 *
 * Steps:
 *  1. Read the NextAuth session (via `auth()` from auth.ts)
 *  2. Upsert the OAuth user in our PostgreSQL `users` table
 *  3. Issue our own `user_session` HttpOnly JWT cookie
 *  4. Return the public user object so the client can hydrate Zustand
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import pool from "@/db";
import { signUserToken, USER_COOKIE, userCookieOptions } from "@/lib/userAuth";

export async function POST() {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json(
      { error: "Nu există o sesiune OAuth activă. Autentifică-te mai întâi." },
      { status: 401 },
    );
  }

  const { email, name, image } = session.user;
  const emailNorm   = email.trim().toLowerCase();
  const displayName = name?.trim() || emailNorm.split("@")[0];

  let client;
  try {
    client = await pool.connect();

    // Upsert: create the user if they don't exist yet; otherwise update
    // name and avatar_url (without touching password_hash for existing accounts).
    // OAuth users receive a placeholder password_hash that can never match a
    // real password, effectively making their account OAuth-only.
    const result = await client.query<{
      id: string;
      name: string;
      email: string;
      phone: string | null;
      address: string | null;
      city: string | null;
      avatar_url: string | null;
    }>(
      `INSERT INTO users (name, email, avatar_url, role, password_hash)
       VALUES ($1, $2, $3, 'customer', 'OAUTH_NO_PASSWORD')
       ON CONFLICT (email) DO UPDATE
         SET name       = COALESCE(EXCLUDED.name, users.name),
             avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url)
       RETURNING id, name, email, phone, address, city, avatar_url`,
      [displayName, emailNorm, image ?? null],
    );

    const row = result.rows[0];

    const token = await signUserToken({
      sub:   row.id,
      name:  row.name,
      email: row.email,
      role:  "customer",
    });

    const response = NextResponse.json({
      user: {
        id:         row.id,
        name:       row.name,
        email:      row.email,
        phone:      row.phone      ?? undefined,
        address:    row.address    ?? undefined,
        city:       row.city       ?? undefined,
        avatar_url: row.avatar_url ?? undefined,
      },
    });

    response.cookies.set(USER_COOKIE, token, userCookieOptions());
    return response;
  } catch (err) {
    console.error("[api/auth/oauth-session POST]", err);
    return NextResponse.json(
      { error: "Eroare la crearea sesiunii. Încearcă din nou." },
      { status: 500 },
    );
  } finally {
    client?.release();
  }
}
