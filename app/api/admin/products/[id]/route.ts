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

// ─── Validation ───────────────────────────────────────────────────────────────

const urlSchema = z.string();

const SUBCATEGORY_IDS = [
  "cpu", "placa_baza", "gpu", "ram", "sursa", "carcasa", "stocare",
] as const;

const CATEGORY_IDS = [
  "laptop", "phone", "tablet", "accessories", "desktop", "components",
] as const;

const patchSchema = z
  .object({
    name:           z.string().min(2).optional(),
    description:    z.string().optional(),
    price:          z.number().positive().optional(),
    old_price:      z.number().positive().nullable().optional(),
    stock:          z.number().int().min(0).optional(),
    category:       z.enum(CATEGORY_IDS).optional(),
    subcategory:    z.enum(SUBCATEGORY_IDS).nullable().optional(),
    image_gallery:  z.array(urlSchema).optional(),
    specifications: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.category === "components" && data.subcategory === undefined) {
      ctx.addIssue({
        code:    z.ZodIssueCode.custom,
        message: "Subcategoria este obligatorie pentru componente.",
        path:    ["subcategory"],
      });
    }
    if (data.category !== undefined && data.category !== "components" && data.subcategory) {
      ctx.addIssue({
        code:    z.ZodIssueCode.custom,
        message: "Subcategoria este permisă doar pentru categoria Componente.",
        path:    ["subcategory"],
      });
    }
    if (
      data.old_price != null &&
      data.price != null &&
      data.old_price <= data.price
    ) {
      ctx.addIssue({
        code:    z.ZodIssueCode.custom,
        message: "Prețul întreg trebuie să fie mai mare decât prețul de vânzare.",
        path:    ["old_price"],
      });
    }
  });

// ─── DELETE /api/admin/products/[id] ─────────────────────────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Neautorizat." }, { status: 401 });
  }

  const { id } = await params;

  let client;
  try {
    client = await pool.connect();
    const result = await client.query(
      `DELETE FROM products WHERE id = $1 RETURNING id`,
      [id]
    );
    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Produsul nu a fost găsit." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/admin/products DELETE]", err);
    return NextResponse.json({ error: "Eroare server la ștergere." }, { status: 500 });
  } finally {
    client?.release();
  }
}

// ─── PATCH /api/admin/products/[id] ──────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Neautorizat." }, { status: 401 });
  }

  const { id } = await params;

  const body   = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Date invalide.", issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const data = parsed.data;

  // Build SET clause dynamically from whichever fields were sent
  const setClauses: string[] = [];
  const values:     unknown[] = [];
  let   idx = 1;

  if (data.name           !== undefined) { setClauses.push(`name = $${idx++}`);           values.push(data.name);                       }
  if (data.description    !== undefined) { setClauses.push(`description = $${idx++}`);    values.push(data.description);                }
  if (data.price          !== undefined) { setClauses.push(`price = $${idx++}`);          values.push(data.price);                      }
  if (data.old_price      !== undefined) { setClauses.push(`old_price = $${idx++}`);      values.push(data.old_price);                  }
  if (data.stock          !== undefined) { setClauses.push(`stock = $${idx++}`);          values.push(data.stock);                      }
  if (data.category       !== undefined) { setClauses.push(`category = $${idx++}`);       values.push(data.category);                   }
  if (data.category       !== undefined || data.subcategory !== undefined) {
    const resolvedSubcategory =
      data.category === "components" ? (data.subcategory ?? null) : null;
    setClauses.push(`subcategory = $${idx++}`);
    values.push(resolvedSubcategory);
  }
  if (data.specifications !== undefined) { setClauses.push(`specifications = $${idx++}`); values.push(data.specifications);             }
  if (data.image_gallery  !== undefined) {
    const gallery  = data.image_gallery.filter(Boolean);
    const coverUrl = gallery[0] ?? null;
    setClauses.push(`image_gallery = $${idx++}::jsonb`);  values.push(JSON.stringify(gallery));
    setClauses.push(`image_url = $${idx++}`);             values.push(coverUrl);
  }

  if (setClauses.length === 0) {
    return NextResponse.json({ error: "Niciun câmp de actualizat." }, { status: 400 });
  }

  values.push(id); // last placeholder = WHERE id = $N

  let client;
  try {
    client = await pool.connect();
    const result = await client.query(
      `UPDATE products SET ${setClauses.join(", ")} WHERE id = $${idx} RETURNING id`,
      values
    );
    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Produsul nu a fost găsit." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/admin/products PATCH]", err);
    return NextResponse.json({ error: "Eroare server la actualizare." }, { status: 500 });
  } finally {
    client?.release();
  }
}
