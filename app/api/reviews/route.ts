import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import pool from "@/db";
import { verifyUserToken, USER_COOKIE } from "@/lib/userAuth";

type ProductReviewRow = {
  id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: Date | string;
  author_name: string;
};

type ProductReviewDto = {
  id: string;
  user_id: string;
  rating: number;
  comment: string;
  created_at: string;
  author_name: string;
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

function toProductReviewDto(row: ProductReviewRow): ProductReviewDto {
  return {
    id:          String(row.id),
    user_id:     String(row.user_id),
    rating:      row.rating,
    comment:     row.comment ?? "",
    created_at:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at),
    author_name: row.author_name,
  };
}

// ─── GET /api/reviews?product_id= ─────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const productId = req.nextUrl.searchParams.get("product_id");
  if (!productId || !z.string().uuid().safeParse(productId).success) {
    return NextResponse.json({ error: "product_id invalid." }, { status: 400 });
  }

  let client;
  try {
    client = await pool.connect();
    const { rows } = await client.query<ProductReviewRow>(
      `SELECT r.id, r.user_id, r.rating, r.comment, r.created_at, u.name AS author_name
       FROM reviews r
       INNER JOIN users u ON u.id = r.user_id
       WHERE r.product_id = $1
       ORDER BY r.created_at DESC`,
      [productId]
    );

    return NextResponse.json({ reviews: rows.map(toProductReviewDto) });
  } catch (err) {
    console.error("[api/reviews GET]", err);
    return NextResponse.json({ error: "Eroare server." }, { status: 500 });
  } finally {
    client?.release();
  }
}

// ─── POST /api/reviews ────────────────────────────────────────────────────────

const postSchema = z.object({
  product_id: z.string().uuid(),
  rating:     z.number().int().min(1).max(5),
  comment:    z.string().min(10),
});

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return unauthorized();

  const body   = await req.json().catch(() => null);
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Date invalide.", issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { product_id, rating, comment } = parsed.data;

  let client;
  try {
    client = await pool.connect();

    const productCheck = await client.query(
      `SELECT id FROM products WHERE id = $1`,
      [product_id]
    );
    if (productCheck.rows.length === 0) {
      return NextResponse.json({ error: "Produsul nu există." }, { status: 404 });
    }

    const { rows } = await client.query<{
      id: string;
      rating: number;
      comment: string | null;
      created_at: Date | string;
    }>(
      `INSERT INTO reviews (user_id, product_id, rating, comment)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, product_id)
       DO UPDATE SET
         rating = EXCLUDED.rating,
         comment = EXCLUDED.comment,
         created_at = NOW()
       RETURNING id, rating, comment, created_at`,
      [userId, product_id, rating, comment.trim()]
    );

    return NextResponse.json(
      {
        review: {
          id:         String(rows[0].id),
          product_id,
          rating:     rows[0].rating,
          comment:    rows[0].comment ?? "",
          created_at:
            rows[0].created_at instanceof Date
              ? rows[0].created_at.toISOString()
              : String(rows[0].created_at),
        },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[api/reviews POST]", err);
    return NextResponse.json({ error: "Eroare server." }, { status: 500 });
  } finally {
    client?.release();
  }
}
