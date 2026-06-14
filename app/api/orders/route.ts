import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import pool from "@/db";
import { verifyUserToken, USER_COOKIE } from "@/lib/userAuth";

type OrderRow = {
  id: string;
  status: string;
  total_amount: string;
  shipping_cost: string;
  created_at: Date | string;
  shipping_name: string | null;
  shipping_city: string | null;
};

type ItemRow = {
  order_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: string;
};

type OrderItemDto = {
  product_id: string;
  name: string;
  quantity: number;
  unit_price: string;
};

type UserOrderDto = {
  id: string;
  status: string;
  total_amount: string;
  shipping_cost: string;
  created_at: string;
  shipping_name: string | null;
  shipping_city: string | null;
  items: OrderItemDto[];
  payment_method: string;
};

async function getSessionUserId(): Promise<string | null> {
  const jar   = await cookies();
  const token = jar.get(USER_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifyUserToken(token);
  return payload?.sub ?? null;
}

function toIsoDate(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

// ─── GET /api/orders — current user's orders ──────────────────────────────────

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Neautorizat." }, { status: 401 });
  }

  let client;
  try {
    client = await pool.connect();

    const { rows: orders } = await client.query<OrderRow>(
      `SELECT id, status, total_amount, shipping_cost, created_at,
              shipping_name, shipping_city
       FROM orders
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    if (orders.length === 0) {
      return NextResponse.json({ orders: [] });
    }

    const orderIds = orders.map((o) => o.id);
    const { rows: items } = await client.query<ItemRow>(
      `SELECT oi.order_id, oi.product_id, p.name AS product_name,
              oi.quantity, oi.unit_price
       FROM order_items oi
       JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = ANY($1::uuid[])
       ORDER BY oi.order_id, p.name`,
      [orderIds]
    );

    const itemsByOrder = new Map<string, OrderItemDto[]>();
    for (const row of items) {
      const list = itemsByOrder.get(row.order_id) ?? [];
      list.push({
        product_id: row.product_id,
        name:       row.product_name,
        quantity:   row.quantity,
        unit_price: String(row.unit_price),
      });
      itemsByOrder.set(row.order_id, list);
    }

    const result: UserOrderDto[] = orders.map((o) => ({
      id:            String(o.id),
      status:        o.status,
      total_amount:  String(o.total_amount),
      shipping_cost: String(o.shipping_cost),
      created_at:    toIsoDate(o.created_at),
      shipping_name: o.shipping_name,
      shipping_city: o.shipping_city,
      items:         itemsByOrder.get(o.id) ?? [],
      payment_method: "Ramburs la curier",
    }));

    return NextResponse.json({ orders: result });
  } catch (err) {
    console.error("[api/orders GET]", err);
    return NextResponse.json({ error: "Eroare server." }, { status: 500 });
  } finally {
    client?.release();
  }
}
