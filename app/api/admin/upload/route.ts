import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { verifyAdminToken, ADMIN_COOKIE } from "@/lib/adminAuth";

// ─── Auth guard ───────────────────────────────────────────────────────────────

async function requireAdmin() {
  const jar   = await cookies();
  const token = jar.get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifyAdminToken(token);
  return payload?.role === "admin" ? payload : null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const UPLOAD_DIR    = path.join(process.cwd(), "public", "uploads", "products");
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

// ─── POST /api/admin/upload ───────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // 1. Auth
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Neautorizat." }, { status: 401 });
  }

  // 2. Parse FormData
  const formData = await req.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "FormData invalid." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "Niciun fișier primit." }, { status: 400 });
  }

  // 3. Validate type & size
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Tip de fișier neacceptat. Folosiți JPEG, PNG, WebP sau GIF." },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  if (buffer.byteLength > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "Fișierul depășește limita de 5 MB." },
      { status: 413 }
    );
  }

  // 4. Build a unique, filesystem-safe filename
  const ext          = path.extname(file.name).toLowerCase() || ".jpg";
  const safeName     = file.name
    .replace(/\.[^.]+$/, "")               // strip extension
    .replace(/[^a-zA-Z0-9_-]/g, "_")       // replace unsafe chars
    .slice(0, 60);                          // cap length
  const uniqueName   = `${Date.now()}_${safeName}${ext}`;
  const absolutePath = path.join(UPLOAD_DIR, uniqueName);
  const publicPath   = `/uploads/products/${uniqueName}`;

  // 5. Ensure the upload directory exists, then write
  try {
    await mkdir(UPLOAD_DIR, { recursive: true });
    await writeFile(absolutePath, buffer);
  } catch (err) {
    console.error("[api/admin/upload]", err);
    return NextResponse.json({ error: "Eroare la salvarea fișierului." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, url: publicPath }, { status: 201 });
}
