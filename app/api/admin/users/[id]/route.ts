import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import pool from "@/db";
import { requireAdmin } from "@/lib/requireAdmin";

const patchSchema = z.object({
  name:  z.string().min(2).optional(),
  email: z.string().email().optional(),
  role:  z.enum(["customer", "admin"]).optional(),
});

// ─── PATCH /api/admin/users/[id] ─────────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Neautorizat." }, { status: 401 });
  }

  const { id } = await params;
  const body   = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Date invalide." }, { status: 400 });
  }

  const data = parsed.data;
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (data.name !== undefined) {
    setClauses.push(`name = $${idx++}`);
    values.push(data.name.trim());
  }
  if (data.email !== undefined) {
    setClauses.push(`email = $${idx++}`);
    values.push(data.email.trim().toLowerCase());
  }
  if (data.role !== undefined) {
    setClauses.push(`role = $${idx++}`);
    values.push(data.role);
  }

  if (setClauses.length === 0) {
    return NextResponse.json({ error: "Niciun câmp de actualizat." }, { status: 400 });
  }

  values.push(id);

  let client;
  try {
    client = await pool.connect();
    const result = await client.query(
      `UPDATE users SET ${setClauses.join(", ")}
       WHERE id = $${idx}
       RETURNING id, name, email, role, created_at`,
      values
    );
    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Utilizatorul nu a fost găsit." }, { status: 404 });
    }
    return NextResponse.json({ user: result.rows[0] });
  } catch (err: unknown) {
    const pgCode = (err as { code?: string })?.code;
    if (pgCode === "23505") {
      return NextResponse.json(
        { error: "Există deja un utilizator cu acest email." },
        { status: 409 }
      );
    }
    console.error("[api/admin/users PATCH]", err);
    return NextResponse.json({ error: "Eroare server." }, { status: 500 });
  } finally {
    client?.release();
  }
}

// ─── DELETE /api/admin/users/[id] ────────────────────────────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Neautorizat." }, { status: 401 });
  }

  const { id } = await params;

  if (id === admin.sub) {
    return NextResponse.json(
      { error: "Nu poți șterge propriul cont de administrator." },
      { status: 400 }
    );
  }

  let client;
  try {
    client = await pool.connect();
    const result = await client.query(
      `DELETE FROM users WHERE id = $1 RETURNING id`,
      [id]
    );
    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Utilizatorul nu a fost găsit." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/admin/users DELETE]", err);
    return NextResponse.json({ error: "Eroare server." }, { status: 500 });
  } finally {
    client?.release();
  }
}
