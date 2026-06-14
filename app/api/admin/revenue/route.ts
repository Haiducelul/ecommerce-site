import { NextResponse } from "next/server";
import pool from "@/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const range = searchParams.get("range") || "7"; // "1", "7", or "30" days

  let client;
  try {
    client = await pool.connect();

    let query = "";
    let params: any[] = [];

    if (range === "1") {
      // Last day - group by hour
      query = `
        SELECT
          EXTRACT(HOUR FROM created_at) as date,
          SUM(total_amount) as revenue
        FROM orders
        WHERE created_at >= NOW() - INTERVAL '1 day'
          AND status != 'Anulată'
        GROUP BY EXTRACT(HOUR FROM created_at)
        ORDER BY date ASC
      `;
    } else {
      // 7 or 30 days - group by day
      const days = range === "30" ? 30 : 7;
      query = `
        SELECT
          DATE(created_at) as date,
          SUM(total_amount) as revenue
        FROM orders
        WHERE created_at >= NOW() - INTERVAL '${days} days'
          AND status != 'Anulată'
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `;
    }

    const { rows } = await client.query(query, params);

    return NextResponse.json({ data: rows });
  } catch (err) {
    console.error("[api/admin/revenue] Error:", err);
    return NextResponse.json(
      { error: "Nu s-au putut încărca datele de venituri." },
      { status: 500 }
    );
  } finally {
    client?.release();
  }
}
