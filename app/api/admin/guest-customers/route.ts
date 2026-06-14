import { NextResponse } from "next/server";
import pool from "@/db";
import { requireAdmin } from "@/lib/requireAdmin";

type GuestCustomerRow = {
  shipping_name:  string | null;
  shipping_email: string | null;
  latest_order_at: Date | string;
};

export type GuestCustomerDto = {
  shipping_name:  string;
  shipping_email: string;
  latest_order_at: string;
};

function toGuestCustomerDto(row: GuestCustomerRow): GuestCustomerDto {
  return {
    shipping_name:  row.shipping_name?.trim() || "—",
    shipping_email: row.shipping_email?.trim().toLowerCase() || "—",
    latest_order_at:
      row.latest_order_at instanceof Date
        ? row.latest_order_at.toISOString()
        : String(row.latest_order_at),
  };
}

// ─── GET /api/admin/guest-customers ───────────────────────────────────────────

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Neautorizat." }, { status: 401 });
  }

  let client;
  try {
    client = await pool.connect();
    const { rows } = await client.query<GuestCustomerRow>(
      `SELECT
         (ARRAY_AGG(o.shipping_name ORDER BY o.created_at DESC))[1] AS shipping_name,
         LOWER(TRIM(o.shipping_email))                             AS shipping_email,
         MAX(o.created_at)                                         AS latest_order_at
       FROM orders o
       WHERE o.user_id IS NULL
         AND o.shipping_email IS NOT NULL
         AND TRIM(o.shipping_email) <> ''
       GROUP BY LOWER(TRIM(o.shipping_email))
       ORDER BY latest_order_at DESC`
    );

    return NextResponse.json({
      guests: rows.map(toGuestCustomerDto),
    });
  } catch (err) {
    console.error("[api/admin/guest-customers GET]", err);
    return NextResponse.json({ error: "Eroare server." }, { status: 500 });
  } finally {
    client?.release();
  }
}
