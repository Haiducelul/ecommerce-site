import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { verifyAdminToken, ADMIN_COOKIE } from "@/lib/adminAuth";
import pool from "@/db";

// ─── Auth guard ───────────────────────────────────────────────────────────────

async function requireAdmin() {
  const jar   = await cookies();
  const token = jar.get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifyAdminToken(token);
  return payload?.role === "admin" ? payload : null;
}

// ─── Validation schema ────────────────────────────────────────────────────────

// Accept both absolute URLs (https://…) and local upload paths (/uploads/…)
const urlSchema = z.string();

const SUBCATEGORY_IDS = [
  "cpu", "placa_baza", "gpu", "ram", "sursa", "carcasa", "stocare",
] as const;

const CATEGORY_IDS = [
  "laptop", "phone", "tablet", "accessories", "desktop", "components",
] as const;

const productSchema = z
  .object({
    name:           z.string().min(2, "Cel puțin 2 caractere."),
    description:    z.string().optional(),
    price:          z.number().positive("Prețul trebuie să fie pozitiv."),
    old_price:      z.number().positive().nullable().optional(),
    stock:          z.number().int().min(0, "Stocul nu poate fi negativ."),
    category:       z.enum(CATEGORY_IDS),
    subcategory:    z.enum(SUBCATEGORY_IDS).nullable().optional(),
    image_gallery:  z.array(urlSchema).default([]),
    specifications: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.category === "components" && !data.subcategory) {
      ctx.addIssue({
        code:    z.ZodIssueCode.custom,
        message: "Subcategoria este obligatorie pentru componente.",
        path:    ["subcategory"],
      });
    }
    if (data.category !== "components" && data.subcategory) {
      ctx.addIssue({
        code:    z.ZodIssueCode.custom,
        message: "Subcategoria este permisă doar pentru categoria Componente.",
        path:    ["subcategory"],
      });
    }
    if (data.old_price != null && data.old_price <= data.price) {
      ctx.addIssue({
        code:    z.ZodIssueCode.custom,
        message: "Prețul întreg trebuie să fie mai mare decât prețul de vânzare.",
        path:    ["old_price"],
      });
    }
  });

// ─── POST /api/admin/products ─────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Neautorizat." }, { status: 401 });
  }

  const body   = await req.json().catch(() => null);
  const parsed = productSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Date invalide.", issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const {
    name, description, price, old_price, stock,
    category, subcategory,
    image_gallery, specifications,
  } = parsed.data;

  const gallery  = image_gallery.filter(Boolean);
  const coverUrl = gallery[0] ?? null;
  const resolvedSubcategory = category === "components" ? subcategory ?? null : null;

  let client;
  try {
    client = await pool.connect();
    const result = await client.query(
      `INSERT INTO products
         (name, description, price, old_price, stock, category, subcategory,
          image_url, image_gallery, specifications)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10)
       RETURNING id, name, price, old_price, stock, category, subcategory`,
      [
        name,
        description ?? null,
        price,
        old_price ?? null,
        stock,
        category,
        resolvedSubcategory,
        coverUrl,
        JSON.stringify(gallery),
        specifications ?? "",
      ]
    );

    return NextResponse.json({ ok: true, product: result.rows[0] }, { status: 201 });
  } catch (err) {
    console.error("[api/admin/products POST]", err);
    return NextResponse.json({ error: "Eroare server la salvarea produsului." }, { status: 500 });
  } finally {
    client?.release();
  }
}
