import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, ADMIN_COOKIE } from "@/lib/adminAuth";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Let the login page and its API route through unconditionally
  if (
    pathname === "/admin/login" ||
    pathname.startsWith("/api/admin/login")
  ) {
    return NextResponse.next();
  }

  // All other /admin/* routes require a valid admin JWT cookie
  if (pathname.startsWith("/admin")) {
    const token = req.cookies.get(ADMIN_COOKIE)?.value;

    if (!token) {
      return redirectToLogin(req);
    }

    const payload = await verifyAdminToken(token);

    if (!payload || payload.role !== "admin") {
      return redirectToLogin(req);
    }

    // Token is valid — attach admin identity as a request header
    // so server components can read it without re-verifying
    const res = NextResponse.next();
    res.headers.set("x-admin-id",    payload.sub);
    res.headers.set("x-admin-name",  payload.name);
    res.headers.set("x-admin-email", payload.email);
    return res;
  }

  return NextResponse.next();
}

function redirectToLogin(req: NextRequest) {
  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = "/admin/login";
  // Preserve the original destination so we can redirect back after login
  loginUrl.searchParams.set("from", req.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Run on all /admin/* paths — skip static assets and Next internals
  matcher: ["/admin/:path*"],
};
