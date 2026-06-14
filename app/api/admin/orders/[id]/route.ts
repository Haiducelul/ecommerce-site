import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import pool from "@/db";
import { requireAdmin } from "@/lib/requireAdmin";
import { ORDER_STATUS_VALUES } from "@/lib/orderStatus";

const patchSchema = z.object({
  status: z.enum(ORDER_STATUS_VALUES),
});

// ─── PATCH /api/admin/orders/[id] ────────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Neautorizat." }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Status invalid." }, { status: 400 });
  }

  let client;
  try {
    client = await pool.connect();
    const result = await client.query(
      `UPDATE orders
       SET status = $1
       WHERE id = $2
       RETURNING id, status`,
      [parsed.data.status, id]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: "Comanda nu a fost găsită." },
        { status: 404 }
      );
    }

    return NextResponse.json({ order: result.rows[0] });
  } catch (err) {
    console.error("[api/admin/orders PATCH]", err);
    return NextResponse.json({ error: "Eroare server." }, { status: 500 });
  } finally {
    client?.release();
  }
}
