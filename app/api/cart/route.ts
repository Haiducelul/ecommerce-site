import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import pool from "@/db";
import { verifyUserToken, USER_COOKIE } from "@/lib/userAuth";

type CartRow = {
  id: string;
  name: string;
  price: string;
  image_url: string | null;
  stock: number;
  quantity: number;
};

type CartItemDto = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl: string | null;
  stock: number;
};

async function getSessionUserId(): Promise<string | null> {
  const jar   = await cookies();
  const token = jar.get(USER_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifyUserToken(token);
  return payload?.sub ?? null;
}

function unauthorized() {
  return NextResponse.json(
    { error: "Trebuie să fii autentificat." },
    { status: 401 }
  );
}

function toCartItemDto(row: CartRow): CartItemDto {
  return {
    id:       String(row.id),
    name:     row.name,
    price:    Number(row.price),
    quantity: row.quantity,
    imageUrl: row.image_url,
    stock:    row.stock,
  };
}

async function fetchUserCart(
  client: Awaited<ReturnType<typeof pool.connect>>,
  userId: string
): Promise<CartItemDto[]> {
  const { rows } = await client.query<CartRow>(
    `SELECT p.id, p.name, p.price, p.image_url, p.stock, c.quantity
     FROM cart_items c
     INNER JOIN products p ON p.id = c.product_id
     WHERE c.user_id = $1
     ORDER BY p.name ASC`,
    [userId]
  );
  return rows.map(toCartItemDto);
}

// ─── GET /api/cart ────────────────────────────────────────────────────────────

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return unauthorized();

  let client;
  try {
    client = await pool.connect();
    const items = await fetchUserCart(client, userId);
    return NextResponse.json({ items });
  } catch (err) {
    console.error("[api/cart GET]", err);
    return NextResponse.json({ error: "Eroare server." }, { status: 500 });
  } finally {
    client?.release();
  }
}

// ─── POST /api/cart ───────────────────────────────────────────────────────────

const postSchema = z.object({
  product_id: z.string().uuid(),
  quantity:   z.number().int().positive().optional().default(1),
});

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return unauthorized();

  const body   = await req.json().catch(() => null);
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Date invalide." }, { status: 400 });
  }

  const { product_id, quantity } = parsed.data;

  let client;
  try {
    client = await pool.connect();

    const productResult = await client.query<{ stock: number; name: string }>(
      `SELECT stock, name FROM products WHERE id = $1`,
      [product_id]
    );
    if (productResult.rows.length === 0) {
      return NextResponse.json({ error: "Produsul nu există." }, { status: 404 });
    }

    const product = productResult.rows[0];
    const existing = await client.query<{ quantity: number }>(
      `SELECT quantity FROM cart_items WHERE user_id = $1 AND product_id = $2`,
      [userId, product_id]
    );
    const currentQty = existing.rows[0]?.quantity ?? 0;
    const newQty     = currentQty + quantity;

    if (product.stock < newQty) {
      return NextResponse.json(
        { error: `Stoc insuficient pentru „${product.name}".` },
        { status: 400 }
      );
    }

    await client.query(
      `INSERT INTO cart_items (user_id, product_id, quantity)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, product_id)
       DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity`,
      [userId, product_id, quantity]
    );

    const items = await fetchUserCart(client, userId);
    return NextResponse.json({ items }, { status: 200 });
  } catch (err) {
    console.error("[api/cart POST]", err);
    return NextResponse.json({ error: "Eroare server." }, { status: 500 });
  } finally {
    client?.release();
  }
}

// ─── DELETE /api/cart — clear entire cart ───────────────────────────────────────

export async function DELETE() {
  const userId = await getSessionUserId();
  if (!userId) return unauthorized();

  let client;
  try {
    client = await pool.connect();
    await client.query(`DELETE FROM cart_items WHERE user_id = $1`, [userId]);
    return NextResponse.json({ cleared: true });
  } catch (err) {
    console.error("[api/cart DELETE]", err);
    return NextResponse.json({ error: "Eroare server." }, { status: 500 });
  } finally {
    client?.release();
  }
}
