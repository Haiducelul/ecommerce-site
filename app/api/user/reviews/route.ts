import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import pool from "@/db";
import { verifyUserToken, USER_COOKIE } from "@/lib/userAuth";

type UserReviewRow = {
  id: string;
  product_id: string;
  product_name: string;
  image_url: string | null;
  rating: number;
  comment: string | null;
  created_at: Date | string;
};

type UserReviewDto = {
  id: string;
  product_id: string;
  product_name: string;
  image_url: string | null;
  rating: number;
  comment: string;
  created_at: string;
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

function toUserReviewDto(row: UserReviewRow): UserReviewDto {
  return {
    id:           String(row.id),
    product_id:   String(row.product_id),
    product_name: row.product_name,
    image_url:    row.image_url,
    rating:       row.rating,
    comment:      row.comment ?? "",
    created_at:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at),
  };
}

// ─── GET /api/user/reviews ────────────────────────────────────────────────────

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return unauthorized();

  let client;
  try {
    client = await pool.connect();
    const { rows } = await client.query<UserReviewRow>(
      `SELECT
         r.id,
         r.product_id,
         p.name AS product_name,
         p.image_url,
         r.rating,
         r.comment,
         r.created_at
       FROM reviews r
       INNER JOIN products p ON p.id = r.product_id
       WHERE r.user_id = $1
       ORDER BY r.created_at DESC`,
      [userId]
    );

    return NextResponse.json({
      reviews: rows.map(toUserReviewDto),
    });
  } catch (err) {
    console.error("[api/user/reviews GET]", err);
    return NextResponse.json({ error: "Eroare server." }, { status: 500 });
  } finally {
    client?.release();
  }
}
