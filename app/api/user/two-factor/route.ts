import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import pool from "@/db";
import { verifyUserToken, USER_COOKIE } from "@/lib/userAuth";

const schema = z.object({
  enabled: z.boolean(),
});

async function getSessionUserId(): Promise<string | null> {
  const jar   = await cookies();
  const token = jar.get(USER_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifyUserToken(token);
  return payload?.sub ?? null;
}

export async function PATCH(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Neautorizat." }, { status: 401 });
  }

  const body   = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Date invalide." }, { status: 400 });
  }

  const { enabled } = parsed.data;

  let client;
  try {
    client = await pool.connect();
    await client.query(
      `UPDATE users SET is_two_factor_enabled = $1 WHERE id = $2 AND role = 'customer'`,
      [enabled, userId]
    );

    return NextResponse.json({ isTwoFactorEnabled: enabled });
  } catch (err) {
    console.error("[api/user/two-factor PATCH]", err);
    return NextResponse.json({ error: "Eroare server." }, { status: 500 });
  } finally {
    client?.release();
  }
}
