import { NextResponse } from "next/server";
import { getProductsByIds } from "@/lib/db-products";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const idsParam = searchParams.get("ids");

  if (!idsParam?.trim()) {
    return NextResponse.json(
      { error: "ids query parameter is required." },
      { status: 400 },
    );
  }

  const ids = idsParam
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  if (ids.length === 0) {
    return NextResponse.json({ products: [] });
  }

  try {
    const products = await getProductsByIds(ids);
    return NextResponse.json({
      products: products.map((p) => ({
        id:    p.id,
        stock: p.stock,
      })),
    });
  } catch (err) {
    console.error("[api/products GET]", err);
    return NextResponse.json({ error: "Eroare server." }, { status: 500 });
  }
}
