import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import pool from "@/db";
import { signUserToken, USER_COOKIE, userCookieOptions } from "@/lib/userAuth";

const schema = z.object({
  email: z.string().email(),
  code:  z.string().length(6).regex(/^\d{6}$/),
});

export async function POST(req: NextRequest) {
  const body   = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Date invalide." }, { status: 400 });
  }

  const { email, code } = parsed.data;
  const emailNorm = email.trim().toLowerCase();

  let client;
  try {
    client = await pool.connect();

    // Clean up expired tokens first
    await client.query(
      `DELETE FROM two_factor_tokens WHERE expires_at < NOW()`
    );

    // Fetch the token record for this email
    const { rows } = await client.query(
      `SELECT id, token, expires_at
       FROM two_factor_tokens
       WHERE email = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [emailNorm]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Codul a expirat sau este invalid. Solicită un cod nou." },
        { status: 400 }
      );
    }

    const record = rows[0];

    if (record.token !== code) {
      return NextResponse.json(
        { error: "Cod incorect. Verifică emailul și încearcă din nou." },
        { status: 400 }
      );
    }

    // Token is valid — delete it (single-use)
    await client.query(
      `DELETE FROM two_factor_tokens WHERE id = $1`,
      [record.id]
    );

    // Fetch the user
    const userResult = await client.query(
      `SELECT id, name, email, phone, address, city, avatar_url
       FROM users WHERE email = $1 AND role = 'customer'`,
      [emailNorm]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: "Utilizator negăsit." }, { status: 404 });
    }

    const user = userResult.rows[0];

    const jwtToken = await signUserToken({
      sub:   user.id,
      name:  user.name,
      email: user.email,
      role:  "customer",
    });

    const response = NextResponse.json({
      user: {
        id:         user.id,
        name:       user.name,
        email:      user.email,
        phone:      user.phone ?? undefined,
        address:    user.address ?? undefined,
        city:       user.city ?? undefined,
        avatar_url: user.avatar_url ?? undefined,
      },
    });

    response.cookies.set(USER_COOKIE, jwtToken, userCookieOptions());
    return response;
  } catch (err) {
    console.error("[api/auth/verify-2fa]", err);
    return NextResponse.json({ error: "Eroare server." }, { status: 500 });
  } finally {
    client?.release();
  }
}
