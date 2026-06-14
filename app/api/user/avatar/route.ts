import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import pool from "@/db";
import { verifyUserToken, USER_COOKIE } from "@/lib/userAuth";

async function getSessionUserId(): Promise<string | null> {
  const jar = await cookies();
  const token = jar.get(USER_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifyUserToken(token);
  return payload?.sub ?? null;
}

export async function PATCH(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Neautorizat." }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("avatar") as File;

    if (!file) {
      return NextResponse.json({ error: "Niciun fișier încărcat." }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Te rog să încarci o imagine validă." }, { status: 400 });
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: "Imaginea nu poate fi mai mare de 2MB." }, { status: 400 });
    }

    // Create unique filename
    const timestamp = Date.now();
    const extension = file.name.split(".").pop() || "jpg";
    const filename = `${userId}-${timestamp}.${extension}`;

    // Ensure upload directory exists
    const uploadDir = join(process.cwd(), "public", "uploads", "profile_pictures");
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (err) {
      // Directory might already exist, ignore error
    }

    // Save file locally
    const filePath = join(uploadDir, filename);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Store relative path in database
    const avatarUrl = `/uploads/profile_pictures/${filename}`;

    let client;
    try {
      client = await pool.connect();
      const result = await client.query(
        `UPDATE users
         SET avatar_url = $1
         WHERE id = $2
         RETURNING id, avatar_url`,
        [avatarUrl, userId]
      );

      if (result.rowCount === 0) {
        return NextResponse.json({ error: "Utilizatorul nu a fost găsit." }, { status: 404 });
      }

      return NextResponse.json({ avatar_url: result.rows[0].avatar_url });
    } catch (err) {
      console.error("[api/user/avatar PATCH]", err);
      return NextResponse.json({ error: "Eroare server la actualizarea avatarului." }, { status: 500 });
    } finally {
      client?.release();
    }
  } catch (err) {
    console.error("[api/user/avatar PATCH]", err);
    return NextResponse.json({ error: "Eroare server la procesarea fișierului." }, { status: 500 });
  }
}
