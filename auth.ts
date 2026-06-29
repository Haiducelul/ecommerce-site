/**
 * auth.ts — NextAuth v5 configuration
 *
 * Providers: Google (built-in) + Yahoo (custom OAuth 2.0 / OIDC)
 * Session strategy: JWT (no DB adapter needed for the NextAuth session itself)
 *
 * After OAuth completes, the browser is redirected to /oauth-callback
 * which calls POST /api/auth/oauth-session to:
 *   1. Upsert the user in our PostgreSQL users table
 *   2. Issue our own user_session JWT cookie
 *   3. Return the user object so the client can hydrate Zustand
 */

import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import type { OAuthConfig, OAuthUserConfig } from "next-auth/providers";

// ─── Yahoo OIDC provider ──────────────────────────────────────────────────────

interface YahooProfile {
  sub: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  email: string;
  picture?: string;
}

function YahooProvider(
  options: OAuthUserConfig<YahooProfile>,
): OAuthConfig<YahooProfile> {
  return {
    id: "yahoo",
    name: "Yahoo",
    type: "oidc",
    issuer: "https://api.login.yahoo.com",
    authorization: {
      url: "https://api.login.yahoo.com/oauth2/request_auth",
      params: { scope: "openid email profile" },
    },
    token: "https://api.login.yahoo.com/oauth2/get_token",
    userinfo: "https://api.login.yahoo.com/openid/v1/userinfo",
    profile(profile) {
      return {
        id: profile.sub,
        name:
          (profile.name ??
          [profile.given_name, profile.family_name].filter(Boolean).join(" ")) ||
          profile.email.split("@")[0],
        email: profile.email,
        image: profile.picture ?? null,
      };
    },
    style: { text: "#400090", bg: "#ffffff" },
    ...options,
  };
}

// ─── NextAuth config ──────────────────────────────────────────────────────────

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId:     process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "select_account",
          scope:  "openid email profile",
        },
      },
    }),
    YahooProvider({
      clientId:     process.env.YAHOO_CLIENT_ID!,
      clientSecret: process.env.YAHOO_CLIENT_SECRET!,
    }),
  ],

  session: { strategy: "jwt" },

  callbacks: {
    // Store provider name in the token so the bridge endpoint can log it
    async jwt({ token, account }) {
      if (account) {
        token.provider = account.provider;
      }
      return token;
    },
    async session({ session, token }) {
      (session as typeof session & { provider?: string }).provider =
        token.provider as string | undefined;
      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,

  // Redirect to our bridge page after a successful OAuth flow
  pages: {
    signIn: "/sign-in",
  },
});
