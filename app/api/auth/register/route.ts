import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { z } from "zod";
import pool from "@/db";
import { signUserToken, USER_COOKIE, userCookieOptions } from "@/lib/userAuth";

const BCRYPT_ROUNDS = 12;

const schema = z.object({
  name:     z.string().min(2),
  email:    z.string().email(),
  password: z.string().min(4),
});

export async function POST(req: NextRequest) {
  const body   = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Date invalide." }, { status: 400 });
  }

  const { name, email, password } = parsed.data;
  const emailNorm = email.trim().toLowerCase();

  let client;
  try {
    const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    client = await pool.connect();

    const result = await client.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, 'customer')
       RETURNING id, name, email, phone, address, city, avatar_url`,
      [name.trim(), emailNorm, password_hash]
    );

    const row = result.rows[0];
    const token = await signUserToken({
      sub:   row.id,
      name:  row.name,
      email: row.email,
      role:  "customer",
    });

    const response = NextResponse.json(
      {
        user: {
          id:         row.id,
          name:       row.name,
          email:      row.email,
          phone:      row.phone ?? undefined,
          address:    row.address ?? undefined,
          city:       row.city ?? undefined,
          avatar_url: row.avatar_url ?? undefined,
        },
      },
      { status: 201 }
    );

    response.cookies.set(USER_COOKIE, token, userCookieOptions());
    return response;
  } catch (err: unknown) {
    const pgCode = (err as { code?: string })?.code;
    if (pgCode === "23505") {
      return NextResponse.json(
        { error: "Există deja un cont cu acest email." },
        { status: 409 }
      );
    }
    console.error("[api/auth/register]", err);
    return NextResponse.json({ error: "Eroare server." }, { status: 500 });
  } finally {
    client?.release();
  }
}
