import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import pool from "@/db";
import { verifyUserToken, USER_COOKIE } from "@/lib/userAuth";

type FavoriteRow = {
  id: string;
  name: string;
  price: string;
  old_price: string | null;
  stock: number;
  category: string;
  image_url: string | null;
};

type FavoriteProductDto = {
  id: string;
  name: string;
  price: number;
  oldPrice: number | null;
  stock: number;
  category: string;
  imageUrl: string | null;
};

async function getSessionUserId(): Promise<string | null> {
  const jar   = await cookies();
  const token = jar.get(USER_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifyUserToken(token);
  return payload?.sub ?? null;
}

function toFavoriteDto(row: FavoriteRow): FavoriteProductDto {
  return {
    id:       String(row.id),
    name:     row.name,
    price:    Number(row.price),
    oldPrice: row.old_price != null ? Number(row.old_price) : null,
    stock:    Number(row.stock ?? 0),
    category: row.category,
    imageUrl: row.image_url,
  };
}

function unauthorized() {
  return NextResponse.json(
    { error: "Trebuie să fii autentificat." },
    { status: 401 }
  );
}

// ─── GET /api/favorites ─────────────────────────────────────────────────────────

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return unauthorized();

  let client;
  try {
    client = await pool.connect();
    const { rows } = await client.query<FavoriteRow>(
      `SELECT p.id, p.name, p.price, p.old_price, p.stock, p.category, p.image_url
       FROM favorites f
       INNER JOIN products p ON p.id = f.product_id
       WHERE f.user_id = $1
       ORDER BY p.name ASC`,
      [userId]
    );

    return NextResponse.json({
      favorites: rows.map(toFavoriteDto),
    });
  } catch (err) {
    console.error("[api/favorites GET]", err);
    return NextResponse.json({ error: "Eroare server." }, { status: 500 });
  } finally {
    client?.release();
  }
}

// ─── POST /api/favorites ────────────────────────────────────────────────────────

const postSchema = z.object({
  product_id: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return unauthorized();

  const body   = await req.json().catch(() => null);
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Date invalide." }, { status: 400 });
  }

  const { product_id } = parsed.data;

  let client;
  try {
    client = await pool.connect();

    const productCheck = await client.query(
      `SELECT id FROM products WHERE id = $1`,
      [product_id]
    );
    if (productCheck.rows.length === 0) {
      return NextResponse.json(
        { error: "Produsul nu există." },
        { status: 404 }
      );
    }

    await client.query(
      `INSERT INTO favorites (user_id, product_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, product_id) DO NOTHING`,
      [userId, product_id]
    );

    const { rows } = await client.query<FavoriteRow>(
      `SELECT p.id, p.name, p.price, p.old_price, p.stock, p.category, p.image_url
       FROM favorites f
       INNER JOIN products p ON p.id = f.product_id
       WHERE f.user_id = $1 AND f.product_id = $2`,
      [userId, product_id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "Eroare la salvare." }, { status: 500 });
    }

    return NextResponse.json(
      { favorite: toFavoriteDto(rows[0]) },
      { status: 201 }
    );
  } catch (err) {
    console.error("[api/favorites POST]", err);
    return NextResponse.json({ error: "Eroare server." }, { status: 500 });
  } finally {
    client?.release();
  }
}

// ─── DELETE /api/favorites ──────────────────────────────────────────────────────

const deleteSchema = z.object({
  product_id: z.string().uuid(),
});

export async function DELETE(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return unauthorized();

  const body   = await req.json().catch(() => null);
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Date invalide." }, { status: 400 });
  }

  const { product_id } = parsed.data;

  let client;
  try {
    client = await pool.connect();
    const result = await client.query(
      `DELETE FROM favorites
       WHERE user_id = $1 AND product_id = $2`,
      [userId, product_id]
    );

    return NextResponse.json({
      removed: (result.rowCount ?? 0) > 0,
    });
  } catch (err) {
    console.error("[api/favorites DELETE]", err);
    return NextResponse.json({ error: "Eroare server." }, { status: 500 });
  } finally {
    client?.release();
  }
}
