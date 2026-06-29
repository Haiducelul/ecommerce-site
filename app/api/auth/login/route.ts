import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { z } from "zod";
import crypto from "crypto";
import pool from "@/db";
import { signUserToken, USER_COOKIE, userCookieOptions } from "@/lib/userAuth";
import { sendTwoFactorEmail } from "@/lib/email";

const schema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

const TWO_FACTOR_DOMAINS = new Set(["gmail.com", "yahoo.com", "yahoo.ro"]);

function requiresTwoFactor(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  return TWO_FACTOR_DOMAINS.has(domain);
}

function generateSixDigitCode(): string {
  return String(crypto.randomInt(100_000, 999_999));
}

export async function POST(req: NextRequest) {
  const body   = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Date invalide." }, { status: 400 });
  }

  const { email, password } = parsed.data;
  const emailNorm = email.trim().toLowerCase();

  let client;
  try {
    client = await pool.connect();
    const result = await client.query(
      `SELECT id, name, email, role, password_hash
       FROM users WHERE email = $1`,
      [emailNorm]
    );

    const user = result.rows[0];
    const hashToCheck =
      user?.password_hash ??
      "$2b$12$invalidhashfortimingsafety000000000000000000000";
    const passwordMatch = await bcrypt.compare(password, hashToCheck);

    if (!user || !passwordMatch) {
      return NextResponse.json(
        { error: "Email sau parolă incorectă." },
        { status: 401 }
      );
    }

    if (user.role !== "customer") {
      return NextResponse.json(
        { error: "Folosește panoul de administrare pentru acest cont." },
        { status: 403 }
      );
    }

    // 2FA — only for Gmail / Yahoo addresses
    if (requiresTwoFactor(emailNorm)) {
      const code      = generateSixDigitCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

      await client.query(
        `DELETE FROM two_factor_tokens WHERE email = $1`,
        [emailNorm]
      );
      await client.query(
        `INSERT INTO two_factor_tokens (email, token, expires_at)
         VALUES ($1, $2, $3)`,
        [emailNorm, code, expiresAt]
      );

      await sendTwoFactorEmail(emailNorm, code);

      return NextResponse.json({ requiresTwoFactor: true });
    }

    // All other domains — create session immediately
    const { rows: userRows } = await client.query(
      `SELECT id, name, email, phone, address, city, avatar_url
       FROM users WHERE email = $1`,
      [emailNorm]
    );
    const fullUser = userRows[0];

    const token = await signUserToken({
      sub:   fullUser.id,
      name:  fullUser.name,
      email: fullUser.email,
      role:  "customer",
    });

    const response = NextResponse.json({
      user: {
        id:         fullUser.id,
        name:       fullUser.name,
        email:      fullUser.email,
        phone:      fullUser.phone ?? undefined,
        address:    fullUser.address ?? undefined,
        city:       fullUser.city ?? undefined,
        avatar_url: fullUser.avatar_url ?? undefined,
      },
    });

    response.cookies.set(USER_COOKIE, token, userCookieOptions());
    return response;
  } catch (err) {
    console.error("[api/auth/login]", err);
    return NextResponse.json({ error: "Eroare server." }, { status: 500 });
  } finally {
    client?.release();
  }
}
