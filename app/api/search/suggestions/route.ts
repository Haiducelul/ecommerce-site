import { NextResponse } from "next/server";
import { searchProducts } from "@/lib/db-products";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query?.trim()) {
    return NextResponse.json({ products: [] });
  }

  try {
    const products = await searchProducts(query);
    // Limit to 5 results for the dropdown
    const limitedProducts = products.slice(0, 5);
    
    return NextResponse.json({
      products: limitedProducts.map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        old_price: p.old_price,
        stock: p.stock,
        image_url: p.image_url,
      })),
    });
  } catch (err) {
    console.error("[api/search/suggestions GET]", err);
    return NextResponse.json({ error: "Eroare server." }, { status: 500 });
  }
}
