import { NextResponse } from "next/server";
import pool from "@/db";

export async function GET() {
  let client;
  try {
    client = await pool.connect();

    // Fetch all reviews with user and product information
    const { rows } = await client.query(
      `SELECT 
        r.id,
        r.rating,
        r.comment,
        r.created_at,
        u.name as user_name,
        u.email as user_email,
        p.name as product_name
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       JOIN products p ON r.product_id = p.id
       ORDER BY r.created_at DESC`
    );

    return NextResponse.json({ data: rows });
  } catch (err) {
    console.error("[api/admin/reviews] Error:", err);
    return NextResponse.json(
      { error: "Nu s-au putut încărca recenziile." },
      { status: 500 }
    );
  } finally {
    client?.release();
  }
}
