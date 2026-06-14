import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { z } from "zod";
import pool from "@/db";
import { signAdminToken, ADMIN_COOKIE } from "@/lib/adminAuth";

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  // 1. Validate body
  const body = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Date invalide." }, { status: 400 });
  }

  const { email, password } = parsed.data;

  // 2. Look up user in the database
  let client;
  try {
    client = await pool.connect();
    const result = await client.query(
      "SELECT id, name, email, role, password_hash FROM users WHERE email = $1",
      [email]
    );

    const user = result.rows[0];

    // Use a dummy compare when user not found to prevent timing attacks
    const hashToCheck = user?.password_hash ?? "$2b$12$invalidhashfortimingsafety000000000000000000000";
    const passwordMatch = await bcrypt.compare(password, hashToCheck);

    if (!user || !passwordMatch) {
      return NextResponse.json(
        { error: "Email sau parolă incorectă." },
        { status: 401 }
      );
    }

    if (user.role !== "admin") {
      return NextResponse.json(
        { error: "Acces interzis. Cont fără privilegii de administrator." },
        { status: 403 }
      );
    }

    // 3. Sign JWT
    const token = await signAdminToken({
      sub:   user.id,
      name:  user.name,
      email: user.email,
      role:  "admin",
    });

    // 4. Set HttpOnly cookie and return success
    const response = NextResponse.json({
      ok: true,
      admin: { id: user.id, name: user.name, email: user.email },
    });

    response.cookies.set(ADMIN_COOKIE, token, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === "production",
      sameSite: "lax",
      path:     "/",
      maxAge:   60 * 60 * 8, // 8 hours
    });

    return response;

  } catch (err) {
    console.error("[api/admin/login]", err);
    return NextResponse.json({ error: "Eroare server." }, { status: 500 });
  } finally {
    client?.release();
  }
}
