import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import Stripe from "stripe";
import { z } from "zod";
import pool from "@/db";
import { verifyUserToken, USER_COOKIE } from "@/lib/userAuth";

const cartItemSchema = z.object({
  product_id: z.string().uuid(),
  quantity:   z.number().int().positive(),
});

// Full form data + cart — no order is created here; the webhook does it.
const stripeCheckoutSchema = z.object({
  items:   z.array(cartItemSchema).min(1),
  name:    z.string().min(3),
  email:   z.string().email(),
  phone:   z.string().min(10),
  address: z.string().min(5),
  city:    z.string().min(2),
});

type DbProduct = {
  id:    string;
  price: string;
  stock: number;
  name:  string;
};

async function getSessionUserId(): Promise<string | null> {
  const jar   = await cookies();
  const token = jar.get(USER_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifyUserToken(token);
  return payload?.sub ?? null;
}

function getStripe(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error("STRIPE_SECRET_KEY is not configured.");
  return new Stripe(secretKey);
}

function getAppUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (!url) throw new Error("NEXT_PUBLIC_APP_URL is not configured.");
  return url;
}

function toStripeUnitAmount(priceRon: number): number {
  return Math.round(priceRon * 100);
}

export async function POST(req: NextRequest) {
  const body   = await req.json().catch(() => null);
  const parsed = stripeCheckoutSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Date invalide.", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { items, name, email, phone, address, city } = parsed.data;
  const userId = await getSessionUserId();

  // Merge duplicate product entries
  const cartMap = new Map<string, number>();
  for (const { product_id, quantity } of items) {
    cartMap.set(product_id, (cartMap.get(product_id) ?? 0) + quantity);
  }
  const productIds = [...cartMap.keys()];

  let client;
  try {
    client = await pool.connect();

    const { rows: products } = await client.query<DbProduct>(
      `SELECT id, price, stock, name FROM products WHERE id = ANY($1::uuid[])`,
      [productIds],
    );

    if (products.length !== productIds.length) {
      return NextResponse.json(
        { error: "Unul sau mai multe produse din coș nu mai există." },
        { status: 400 },
      );
    }

    const productMap = new Map(products.map((p) => [p.id, p]));
    const lineItems: { product_id: string; quantity: number; unit_price: number; name: string }[] = [];

    for (const [product_id, quantity] of cartMap) {
      const product  = productMap.get(product_id)!;
      const unitPrice = Number(product.price);

      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        return NextResponse.json({ error: "Preț invalid pentru un produs din coș." }, { status: 400 });
      }
      if (product.stock < quantity) {
        return NextResponse.json(
          { error: `Stoc insuficient pentru „${product.name}".` },
          { status: 400 },
        );
      }

      lineItems.push({ product_id, quantity, unit_price: unitPrice, name: product.name });
    }

    const stripe  = getStripe();
    const appUrl  = getAppUrl();
    const shippingEmail = email.trim().toLowerCase();

    const session = await stripe.checkout.sessions.create({
      mode:           "payment",
      customer_email: shippingEmail,
      line_items: lineItems.map((line) => ({
        quantity:   line.quantity,
        price_data: {
          currency:     "ron",
          unit_amount:  toStripeUnitAmount(line.unit_price),
          product_data: { name: line.name },
        },
      })),
      success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${appUrl}/checkout?payment_failed=1`,
      metadata: {
        user_id:          userId ?? "",
        shipping_name:    name.trim(),
        shipping_email:   shippingEmail,
        shipping_phone:   phone.trim(),
        shipping_address: address.trim(),
        shipping_city:    city.trim(),
        // Cart items encoded for the webhook to create the order
        cart_items: JSON.stringify(
          lineItems.map((l) => ({
            product_id: l.product_id,
            quantity:   l.quantity,
            unit_price: l.unit_price,
          })),
        ),
      },
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Nu s-a putut genera sesiunea Stripe." },
        { status: 500 },
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[api/checkout/stripe POST]", err);
    const message =
      err instanceof Error && err.message.includes("STRIPE")
        ? err.message
        : "Eroare server la inițializarea plății Stripe.";
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    client?.release();
  }
}
