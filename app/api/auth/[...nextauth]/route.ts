/**
 * app/api/auth/[...nextauth]/route.ts
 *
 * Mounts the NextAuth v5 GET + POST handlers for all OAuth routes:
 *   /api/auth/signin, /api/auth/callback/google,
 *   /api/auth/callback/yahoo, /api/auth/session, /api/auth/csrf, etc.
 *
 * Existing specific routes (/api/auth/login, /register, /logout) take
 * precedence in Next.js routing and are NOT affected by this catch-all.
 */

import { handlers } from "@/auth";

export const { GET, POST } = handlers;
