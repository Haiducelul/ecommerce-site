import { cookies } from "next/headers";
import { verifyAdminToken, ADMIN_COOKIE, type AdminJwtPayload } from "@/lib/adminAuth";

/** Returns the admin JWT payload or null if unauthorized. */
export async function requireAdmin(): Promise<AdminJwtPayload | null> {
  const jar   = await cookies();
  const token = jar.get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifyAdminToken(token);
  return payload?.role === "admin" ? payload : null;
}
