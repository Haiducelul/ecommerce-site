import { NextResponse } from "next/server";
import pool from "@/db";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  let client;
  try {
    const { id } = params;
    const body = await request.json();
    const { comment } = body;

    if (!comment) {
      return NextResponse.json(
        { error: "Comentariul este obligatoriu." },
        { status: 400 }
      );
    }

    client = await pool.connect();

    const { rows } = await client.query(
      `UPDATE reviews SET comment = $1 WHERE id = $2 RETURNING *`,
      [comment, id]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Recenzia nu a fost găsită." },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: rows[0] });
  } catch (err) {
    console.error("[api/admin/reviews/[id]] PUT Error:", err);
    return NextResponse.json(
      { error: "Nu s-a putut actualiza recenzia." },
      { status: 500 }
    );
  } finally {
    client?.release();
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  let client;
  try {
    const { id } = params;

    client = await pool.connect();

    const { rows } = await client.query(
      `DELETE FROM reviews WHERE id = $1 RETURNING *`,
      [id]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Recenzia nu a fost găsită." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api/admin/reviews/[id]] DELETE Error:", err);
    return NextResponse.json(
      { error: "Nu s-a putut șterge recenzia." },
      { status: 500 }
    );
  } finally {
    client?.release();
  }
}
