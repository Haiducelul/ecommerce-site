import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, ADMIN_COOKIE } from "@/lib/adminAuth";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Permite accesul necondiționat la pagina de logare și la ruta sa API
  if (
    pathname === "/admin/login" ||
    pathname.startsWith("/api/admin/login")
  ) {
    return NextResponse.next();
  }

  // Toate celelalte rute /admin/* necesită un cookie JWT de admin valid
  if (pathname.startsWith("/admin")) {
    const token = req.cookies.get(ADMIN_COOKIE)?.value;

    if (!token) {
      return redirectToLogin(req);
    }

    const payload = await verifyAdminToken(token);

    if (!payload || payload.role !== "admin") {
      return redirectToLogin(req);
    }

    // Token-ul este valid — atașăm identitatea adminului ca antet (header)
    // astfel încât componentele de server să o poată citi fără a o reverifica
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
  // Păstrăm destinația originală pentru a redirecționa utilizatorul înapoi după logare
  loginUrl.searchParams.set("from", req.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Rulează pe toate căile /admin/* — ignoră fișierele statice și procesele interne Next.js
  matcher: ["/admin/:path*"],
};