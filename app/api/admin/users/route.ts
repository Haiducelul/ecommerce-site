import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { z } from "zod";
import pool from "@/db";
import { requireAdmin } from "@/lib/requireAdmin";

const BCRYPT_ROUNDS = 12;

const createSchema = z.object({
  name:     z.string().min(2),
  email:    z.string().email(),
  password: z.string().min(4),
  role:     z.enum(["customer", "admin"]).default("customer"),
});

// ─── GET /api/admin/users ─────────────────────────────────────────────────────

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Neautorizat." }, { status: 401 });
  }

  let client;
  try {
    client = await pool.connect();
    const { rows } = await client.query(
      `SELECT id, name, email, role, created_at
       FROM users
       ORDER BY created_at DESC`
    );
    return NextResponse.json({ users: rows });
  } catch (err) {
    console.error("[api/admin/users GET]", err);
    return NextResponse.json({ error: "Eroare server." }, { status: 500 });
  } finally {
    client?.release();
  }
}

// ─── POST /api/admin/users ────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Neautorizat." }, { status: 401 });
  }

  const body   = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Date invalide." }, { status: 400 });
  }

  const { name, email, password, role } = parsed.data;
  const emailNorm = email.trim().toLowerCase();

  let client;
  try {
    const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    client = await pool.connect();
    const result = await client.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role, created_at`,
      [name.trim(), emailNorm, password_hash, role]
    );
    return NextResponse.json({ user: result.rows[0] }, { status: 201 });
  } catch (err: unknown) {
    const pgCode = (err as { code?: string })?.code;
    if (pgCode === "23505") {
      return NextResponse.json(
        { error: "Există deja un utilizator cu acest email." },
        { status: 409 }
      );
    }
    console.error("[api/admin/users POST]", err);
    return NextResponse.json({ error: "Eroare server." }, { status: 500 });
  } finally {
    client?.release();
  }
}
