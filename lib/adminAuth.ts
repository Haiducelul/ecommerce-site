/**
 * lib/adminAuth.ts
 *
 * Shared helpers for signing and verifying the admin session JWT.
 * Uses the `jose` library because it runs in both Node.js (API routes)
 * and the Edge Runtime (middleware).
 */
import { SignJWT, jwtVerify } from "jose";

export const ADMIN_COOKIE = "admin_session";

// In production, set a long random string in your environment:
//   openssl rand -hex 32
const rawSecret = process.env.ADMIN_JWT_SECRET ?? "change-me-in-production-secret";
export const JWT_SECRET = new TextEncoder().encode(rawSecret);

export type AdminJwtPayload = {
  sub: string;   // user UUID
  name: string;
  email: string;
  role: "admin";
};

/** Create a signed JWT valid for 8 hours. */
export async function signAdminToken(payload: AdminJwtPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(JWT_SECRET);
}

/** Verify and decode the JWT. Returns null if invalid/expired. */
export async function verifyAdminToken(
  token: string
): Promise<AdminJwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as AdminJwtPayload;
  } catch {
    return null;
  }
}
