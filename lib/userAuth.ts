/**
 * lib/userAuth.ts — storefront customer session JWT (HttpOnly cookie).
 */
import { SignJWT, jwtVerify } from "jose";

export const USER_COOKIE = "user_session";

const rawSecret =
  process.env.USER_JWT_SECRET ??
  process.env.ADMIN_JWT_SECRET ??
  "change-me-in-production-secret";
export const USER_JWT_SECRET = new TextEncoder().encode(rawSecret);

export type UserJwtPayload = {
  sub: string;
  name: string;
  email: string;
  role: "customer";
};

export async function signUserToken(payload: UserJwtPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(USER_JWT_SECRET);
}

export async function verifyUserToken(
  token: string
): Promise<UserJwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, USER_JWT_SECRET);
    const p = payload as unknown as UserJwtPayload;
    return p.role === "customer" ? p : null;
  } catch {
    return null;
  }
}

export function userCookieOptions() {
  return {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path:     "/",
    maxAge:   60 * 60 * 24 * 7, // 7 days
  };
}
