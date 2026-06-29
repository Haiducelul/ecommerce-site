import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import pool from "@/db";
import { verifyUserToken, USER_COOKIE } from "@/lib/userAuth";

const patchSchema = z.object({
  name:    z.string().min(2),
  phone:   z
    .string()
    .regex(/^[0-9+\s()-]*$/, { message: "Număr de telefon invalid." })
    .optional()
    .or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  city:    z.string().optional().or(z.literal("")),
});

type UserRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  avatar_url: string | null;
  is_two_factor_enabled: boolean;
};

function toPublicUser(row: UserRow) {
  return {
    id:                   row.id,
    name:                 row.name,
    email:                row.email,
    phone:                row.phone ?? undefined,
    address:              row.address ?? undefined,
    city:                 row.city ?? undefined,
    avatar_url:           row.avatar_url ?? undefined,
    isTwoFactorEnabled:   row.is_two_factor_enabled,
  };
}

async function getSessionUserId(): Promise<string | null> {
  const jar   = await cookies();
  const token = jar.get(USER_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifyUserToken(token);
  return payload?.sub ?? null;
}

function emptyToNull(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

// ─── GET /api/user/profile ────────────────────────────────────────────────────

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Neautorizat." }, { status: 401 });
  }

  let client;
  try {
    client = await pool.connect();
    const { rows } = await client.query<UserRow>(
      `SELECT id, name, email, phone, address, city, avatar_url, is_two_factor_enabled
       FROM users
       WHERE id = $1 AND role = 'customer'`,
      [userId]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "Utilizator negăsit." }, { status: 404 });
    }

    return NextResponse.json({ user: toPublicUser(rows[0]) });
  } catch (err) {
    console.error("[api/user/profile GET]", err);
    return NextResponse.json({ error: "Eroare server." }, { status: 500 });
  } finally {
    client?.release();
  }
}

// ─── PATCH /api/user/profile ────────────────────────────────────────────────────

export async function PATCH(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Neautorizat." }, { status: 401 });
  }

  const body   = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Date invalide.", issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { name, phone, address, city } = parsed.data;

  let client;
  try {
    client = await pool.connect();
    const { rows } = await client.query<UserRow>(
      `UPDATE users
       SET name = $1,
           phone = $2,
           address = $3,
           city = $4
       WHERE id = $5 AND role = 'customer'
       RETURNING id, name, email, phone, address, city, avatar_url`,
      [
        name.trim(),
        emptyToNull(phone),
        emptyToNull(address),
        emptyToNull(city),
        userId,
      ]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "Utilizator negăsit." }, { status: 404 });
    }

    return NextResponse.json({ user: toPublicUser(rows[0]) });
  } catch (err) {
    console.error("[api/user/profile PATCH]", err);
    return NextResponse.json({ error: "Eroare server." }, { status: 500 });
  } finally {
    client?.release();
  }
}
