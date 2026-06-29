import { NextResponse } from "next/server";
import pool from "@/db";
import { requireAdmin } from "@/lib/requireAdmin";

/** Raw row from pg — NUMERIC and TIMESTAMPTZ need explicit serialization. */
type OrderRow = {
  id: string;
  user_id: string | null;
  full_name: string | null;
  phone: string | null;
  shipping_address: string | null;
  shipping_city: string | null;
  total_amount: string;
  status: string;
  created_at: Date | string;
  user_email: string | null;
};

type OrderItemRow = {
  order_id: string;
  product_name: string;
  quantity: number;
  unit_price: string;
};

type OrderItemDto = {
  name: string;
  quantity: number;
  unit_price: string;
};

type OrderDto = {
  id: string;
  user_id: string | null;
  full_name: string | null;
  phone: string | null;
  shipping_address: string | null;
  shipping_city: string | null;
  total_amount: string;
  status: string;
  created_at: string;
  user_email: string | null;
  items: OrderItemDto[];
};

function toOrderDto(row: OrderRow): OrderDto {
  return {
    id:               String(row.id),
    user_id:          row.user_id ? String(row.user_id) : null,
    full_name:        row.full_name,
    phone:            row.phone,
    shipping_address: row.shipping_address,
    shipping_city:    row.shipping_city,
    total_amount:     String(row.total_amount),
    status:           row.status,
    created_at:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at),
    user_email: row.user_email,
  };
}

// ─── GET /api/admin/orders ────────────────────────────────────────────────────

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Neautorizat." }, { status: 401 });
  }

  let client;
  try {
    client = await pool.connect();
    // Uses schema.sql column names (shipping_name, shipping_phone, shipping_email).
    const { rows } = await client.query<OrderRow>(
      `SELECT
         o.id,
         o.user_id,
         COALESCE(o.shipping_name, u.name)     AS full_name,
         o.shipping_phone                      AS phone,
         o.shipping_address,
         o.shipping_city,
         o.total_amount,
         o.status,
         o.created_at,
         COALESCE(u.email, o.shipping_email)   AS user_email
       FROM orders o
       LEFT JOIN users u ON u.id = o.user_id
       ORDER BY o.created_at DESC`
    );

    if (rows.length === 0) {
      return NextResponse.json({ orders: [] });
    }

    const orderIds = rows.map((o) => o.id);
    const { rows: itemRows } = await client.query<OrderItemRow>(
      `SELECT oi.order_id, p.name AS product_name, oi.quantity, oi.unit_price
       FROM order_items oi
       JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = ANY($1::uuid[])
       ORDER BY oi.order_id, p.name`,
      [orderIds]
    );

    const itemsByOrder = new Map<string, OrderItemDto[]>();
    for (const row of itemRows) {
      const list = itemsByOrder.get(String(row.order_id)) ?? [];
      list.push({
        name:       row.product_name,
        quantity:   row.quantity,
        unit_price: String(row.unit_price),
      });
      itemsByOrder.set(String(row.order_id), list);
    }

    const orders = rows.map((row) => ({
      ...toOrderDto(row),
      items: itemsByOrder.get(String(row.id)) ?? [],
    }));

    return NextResponse.json({ orders });
  } catch (err) {
    console.error("[api/admin/orders GET]", err);
    return NextResponse.json({ error: "Eroare server." }, { status: 500 });
  } finally {
    client?.release();
  }
}
