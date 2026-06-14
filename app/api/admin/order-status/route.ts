import { NextResponse } from "next/server";
import pool from "@/db";

export async function GET() {
  let client;
  try {
    client = await pool.connect();

    // Fetch order counts grouped by status
    const { rows } = await client.query(
      `SELECT 
        status,
        COUNT(*) as count
       FROM orders
       GROUP BY status
       ORDER BY count DESC`
    );

    return NextResponse.json({ data: rows });
  } catch (err) {
    console.error("[api/admin/order-status] Error:", err);
    return NextResponse.json(
      { error: "Nu s-au putut încărca datele de status." },
      { status: 500 }
    );
  } finally {
    client?.release();
  }
}
