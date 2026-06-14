import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { z } from "zod";
import pool from "@/db";
import { signUserToken, USER_COOKIE, userCookieOptions } from "@/lib/userAuth";

const schema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

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
      `SELECT id, name, email, role, password_hash, phone, address, city, avatar_url
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

    const token = await signUserToken({
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

    response.cookies.set(USER_COOKIE, token, userCookieOptions());
    return response;
  } catch (err) {
    console.error("[api/auth/login]", err);
    return NextResponse.json({ error: "Eroare server." }, { status: 500 });
  } finally {
    client?.release();
  }
}
