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

const stripeCheckoutSchema = z.object({
  orderId: z.string().uuid(),
  items:   z.array(cartItemSchema).min(1),
  name:    z.string().min(3),
  email:   z.string().email(),
  phone:   z.string().min(10),
  address: z.string().min(5),
  city:    z.string().min(2),
});

type OrderRow = {
  id:               string;
  user_id:          string | null;
  total_amount:     string;
  payment_method:   string;
  payment_status:   string;
  shipping_email:   string | null;
};

type OrderLineRow = {
  product_id:   string;
  product_name: string;
  quantity:     number;
  unit_price:   string;
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
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }
  return new Stripe(secretKey);
}

function getAppUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (!url) {
    throw new Error("NEXT_PUBLIC_APP_URL is not configured.");
  }
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

  const { orderId, items, name, email, phone, address, city } = parsed.data;
  const sessionUserId = await getSessionUserId();
  const shippingEmail = email.trim().toLowerCase();

  let client;
  try {
    client = await pool.connect();

    const orderResult = await client.query<OrderRow>(
      `SELECT id, user_id, total_amount, payment_method, payment_status, shipping_email
       FROM orders
       WHERE id = $1
       LIMIT 1`,
      [orderId],
    );

    const order = orderResult.rows[0];
    if (!order) {
      return NextResponse.json({ error: "Comanda nu a fost găsită." }, { status: 404 });
    }

    if (order.user_id && sessionUserId && order.user_id !== sessionUserId) {
      return NextResponse.json({ error: "Neautorizat pentru această comandă." }, { status: 403 });
    }

    if (order.payment_status === "paid") {
      return NextResponse.json(
        { error: "Comanda a fost deja plătită." },
        { status: 400 },
      );
    }

    const { rows: orderLines } = await client.query<OrderLineRow>(
      `SELECT oi.product_id, p.name AS product_name, oi.quantity, oi.unit_price
       FROM order_items oi
       INNER JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = $1`,
      [orderId],
    );

    if (orderLines.length === 0) {
      return NextResponse.json(
        { error: "Comanda nu conține produse." },
        { status: 400 },
      );
    }

    const requestedMap = new Map(items.map((item) => [item.product_id, item.quantity]));
    for (const line of orderLines) {
      const requestedQty = requestedMap.get(line.product_id);
      if (requestedQty !== line.quantity) {
        return NextResponse.json(
          { error: "Produsele din coș nu corespund comenzii." },
          { status: 400 },
        );
      }
    }

    if (requestedMap.size !== orderLines.length) {
      return NextResponse.json(
        { error: "Produsele din coș nu corespund comenzii." },
        { status: 400 },
      );
    }

    await client.query(
      `UPDATE orders
       SET shipping_name = $2,
           shipping_email = $3,
           shipping_phone = $4,
           shipping_address = $5,
           shipping_city = $6,
           payment_method = 'card',
           payment_status = 'pending'
       WHERE id = $1`,
      [
        orderId,
        name.trim(),
        shippingEmail,
        phone.trim(),
        address.trim(),
        city.trim(),
      ],
    );

    const stripe = getStripe();
    const appUrl = getAppUrl();

    const session = await stripe.checkout.sessions.create({
      mode:        "payment",
      customer_email: shippingEmail,
      line_items:  orderLines.map((line) => ({
        quantity:   line.quantity,
        price_data: {
          currency:     "ron",
          unit_amount:  toStripeUnitAmount(Number(line.unit_price)),
          product_data: {
            name: line.product_name,
          },
        },
      })),
      success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${appUrl}/checkout`,
      metadata: {
        order_id: orderId,
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
