import { NextResponse } from "next/server";
import pool from "@/db";

export async function GET() {
  let client;
  try {
    client = await pool.connect();

    // Fetch top 5 most sold products based on quantity from OrderItem
    const { rows } = await client.query(
      `SELECT 
        p.name,
        SUM(oi.quantity) as total_sold
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       GROUP BY p.id, p.name
       ORDER BY total_sold DESC
       LIMIT 5`
    );

    return NextResponse.json({ data: rows });
  } catch (err) {
    console.error("[api/admin/top-products] Error:", err);
    return NextResponse.json(
      { error: "Nu s-au putut încărca datele despre produse." },
      { status: 500 }
    );
  } finally {
    client?.release();
  }
}
