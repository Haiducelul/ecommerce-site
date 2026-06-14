import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import pool from "@/db";
import { verifyUserToken, USER_COOKIE } from "@/lib/userAuth";

const cartItemSchema = z.object({
  product_id: z.string().uuid(),
  quantity:   z.number().int().positive(),
});

// Keys must match the checkout form JSON body exactly.
const checkoutSchema = z.object({
  items:          z.array(cartItemSchema).min(1),
  name:           z.string().min(3),
  email:          z.string().email(),
  phone:          z.string().min(10),
  address:        z.string().min(5),
  city:           z.string().min(2),
  payment_method: z.enum(["cash", "card"]).default("cash"),
});

type DbProduct = {
  id:    string;
  price: string;
  stock: number;
  name:  string;
};

async function getSessionUserId(): Promise<string | null> {
  const jar   = await cookies();
  const token = jar.get(USER_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifyUserToken(token);
  return payload?.sub ?? null;
}

function mergeCartItems(
  items: z.infer<typeof cartItemSchema>[]
): Map<string, number> {
  const map = new Map<string, number>();
  for (const { product_id, quantity } of items) {
    map.set(product_id, (map.get(product_id) ?? 0) + quantity);
  }
  return map;
}

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();

  const body   = await req.json().catch(() => null);
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Date invalide.", issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { name, email, phone, address, city, items, payment_method } = parsed.data;
  const cartMap    = mergeCartItems(items);
  const productIds = [...cartMap.keys()];

  // Map request body → PostgreSQL column values
  const shipping_name    = name.trim();
  const shipping_email   = email.trim().toLowerCase();
  const shipping_phone   = phone.trim();
  const shipping_address = address.trim();
  const shipping_city    = city.trim();

  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");

    const { rows: products } = await client.query<DbProduct>(
      `SELECT id, price, stock, name FROM products WHERE id = ANY($1::uuid[])`,
      [productIds]
    );

    if (products.length !== productIds.length) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "Unul sau mai multe produse din coș nu mai există." },
        { status: 400 }
      );
    }

    let total_amount = 0;
    const lineItems: { product_id: string; quantity: number; unit_price: number }[] = [];

    for (const product of products) {
      const quantity  = cartMap.get(product.id)!;
      const unitPrice = Number(product.price);

      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          { error: "Preț invalid pentru un produs din coș." },
          { status: 400 }
        );
      }

      if (product.stock < quantity) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          { error: `Stoc insuficient pentru „${product.name}".` },
          { status: 400 }
        );
      }

      total_amount += unitPrice * quantity;
      lineItems.push({ product_id: product.id, quantity, unit_price: unitPrice });
    }

    const orderResult = await client.query<{ id: string }>(
      `INSERT INTO orders
         (user_id, total_amount, status,
          payment_method, payment_status,
          shipping_name, shipping_email, shipping_phone,
          shipping_address, shipping_city)
       VALUES ($1, $2, 'Plasată', $3, 'pending', $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        userId,
        total_amount,
        payment_method === "card" ? "card" : "cash",
        shipping_name,
        shipping_email,
        shipping_phone,
        shipping_address,
        shipping_city,
      ]
    );

    const orderId = orderResult.rows[0].id;

    for (const line of lineItems) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price)
         VALUES ($1, $2, $3, $4)`,
        [orderId, line.product_id, line.quantity, line.unit_price]
      );

      await client.query(
        `UPDATE products SET stock = stock - $1 WHERE id = $2`,
        [line.quantity, line.product_id]
      );
    }

    if (userId && payment_method === "cash") {
      await client.query(`DELETE FROM cart_items WHERE user_id = $1`, [userId]);
    }

    await client.query("COMMIT");

    return NextResponse.json(
      { order_id: orderId, total_amount, guest: !userId },
      { status: 201 }
    );
  } catch (err) {
    await client?.query("ROLLBACK").catch(() => {});
    console.error("[api/checkout POST]", err);
    return NextResponse.json(
      { error: "Eroare server la plasarea comenzii." },
      { status: 500 }
    );
  } finally {
    client?.release();
  }
}
