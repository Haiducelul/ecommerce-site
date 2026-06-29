import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import pool from "@/db";

// Disable Next.js body parsing — Stripe needs the raw body to verify the signature.
export const config = { api: { bodyParser: false } };

type CartItem = {
  product_id: string;
  quantity:   number;
  unit_price: number;
};

function getStripe(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error("STRIPE_SECRET_KEY is not configured.");
  return new Stripe(secretKey);
}

export async function POST(req: NextRequest) {
  const stripe        = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("[webhook/stripe] STRIPE_WEBHOOK_SECRET is not set.");
    return NextResponse.json({ error: "Webhook secret not configured." }, { status: 500 });
  }

  const body = await req.text();
  const sig  = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature header." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error("[webhook/stripe] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  // Only handle successful payments
  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  // Skip if payment was not actually collected (e.g. free / setup)
  if (session.payment_status !== "paid") {
    return NextResponse.json({ received: true });
  }

  const meta = session.metadata ?? {};
  const userId           = meta.user_id || null;
  const shipping_name    = meta.shipping_name    ?? null;
  const shipping_email   = meta.shipping_email   ?? null;
  const shipping_phone   = meta.shipping_phone   ?? null;
  const shipping_address = meta.shipping_address ?? null;
  const shipping_city    = meta.shipping_city    ?? null;

  let cartItems: CartItem[] = [];
  try {
    cartItems = JSON.parse(meta.cart_items ?? "[]");
  } catch {
    console.error("[webhook/stripe] Failed to parse cart_items from metadata");
    return NextResponse.json({ error: "Invalid cart metadata." }, { status: 400 });
  }

  if (cartItems.length === 0) {
    console.error("[webhook/stripe] cart_items is empty in metadata");
    return NextResponse.json({ error: "Empty cart." }, { status: 400 });
  }

  const total_amount = cartItems.reduce(
    (sum, item) => sum + item.unit_price * item.quantity,
    0,
  );

  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");

    // Lock products and verify stock is still available
    const productIds = cartItems.map((i) => i.product_id);
    type ProductRow = { id: string; stock: number };
    const { rows: products } = await client.query<ProductRow>(
      `SELECT id, stock FROM products WHERE id = ANY($1::uuid[]) FOR UPDATE`,
      [productIds],
    );

    const productMap = new Map<string, ProductRow>(
      products.map((p: ProductRow) => [p.id, p])
    );
    for (const item of cartItems) {
      const product = productMap.get(item.product_id);
      if (!product || product.stock < item.quantity) {
        // Stock issue after payment — log but return 200 so Stripe doesn't retry.
        // Manual intervention required.
        await client.query("ROLLBACK");
        console.error(
          `[webhook/stripe] Insufficient stock for ${item.product_id} after payment. ` +
          `session_id=${session.id}`,
        );
        return NextResponse.json({ received: true, warning: "stock_issue" });
      }
    }

    const orderResult = await client.query<{ id: string }>(
      `INSERT INTO orders
         (user_id, total_amount, status,
          payment_method, payment_status,
          shipping_name, shipping_email, shipping_phone,
          shipping_address, shipping_city)
       VALUES ($1, $2, 'Plasată', 'card', 'paid', $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        userId,
        total_amount,
        shipping_name,
        shipping_email,
        shipping_phone,
        shipping_address,
        shipping_city,
      ],
    );

    const orderId = orderResult.rows[0].id;

    for (const item of cartItems) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price)
         VALUES ($1, $2, $3, $4)`,
        [orderId, item.product_id, item.quantity, item.unit_price],
      );
      await client.query(
        `UPDATE products SET stock = stock - $1 WHERE id = $2`,
        [item.quantity, item.product_id],
      );
    }

    // Clear server-side cart for authenticated users
    if (userId) {
      await client.query(`DELETE FROM cart_items WHERE user_id = $1`, [userId]);
    }

    await client.query("COMMIT");
    console.log(`[webhook/stripe] Order ${orderId} created for session ${session.id}`);
    return NextResponse.json({ received: true, order_id: orderId });
  } catch (err) {
    await client?.query("ROLLBACK").catch(() => {});
    console.error("[webhook/stripe] Error creating order:", err);
    // Return 500 so Stripe retries the webhook
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  } finally {
    client?.release();
  }
}
