import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import pool from "@/db";
import { verifyUserToken, USER_COOKIE } from "@/lib/userAuth";

type RouteContext = { params: Promise<{ productId: string }> };

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

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ─── DELETE /api/cart/[productId] ─────────────────────────────────────────────

export async function DELETE(_req: Request, context: RouteContext) {
  const userId = await getSessionUserId();
  if (!userId) return unauthorized();

  const { productId } = await context.params;
  if (!UUID_RE.test(productId)) {
    return NextResponse.json({ error: "ID produs invalid." }, { status: 400 });
  }

  let client;
  try {
    client = await pool.connect();
    const result = await client.query(
      `DELETE FROM cart_items
       WHERE user_id = $1 AND product_id = $2`,
      [userId, productId]
    );

    return NextResponse.json({
      removed: (result.rowCount ?? 0) > 0,
    });
  } catch (err) {
    console.error("[api/cart/[productId] DELETE]", err);
    return NextResponse.json({ error: "Eroare server." }, { status: 500 });
  } finally {
    client?.release();
  }
}
