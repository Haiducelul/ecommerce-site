import pool from "@/db";
import ProductsClient from "./ProductsClient";

type Product = {
  id:         string;
  name:       string;
  category:   string;
  price:      string;
  stock:      number;
  image_url:  string | null;
  created_at: Date;
};

async function fetchProducts(): Promise<Product[]> {
  let client;
  try {
    client = await pool.connect();
    const result = await client.query<Product>(
      `SELECT id, name, category, price, stock, image_url, created_at
       FROM products
       ORDER BY created_at DESC`
    );
    return result.rows;
  } catch (err) {
    console.error("[admin/products] fetchProducts error:", err);
    return [];
  } finally {
    client?.release();
  }
}

export default async function AdminProductsPage() {
  const products = await fetchProducts();
  return <ProductsClient products={products} />;
}
