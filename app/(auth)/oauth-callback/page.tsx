"use client";

/**
 * /oauth-callback — client-side sync page
 *
 * After NextAuth completes the OAuth flow, the browser lands here.
 * This page:
 *   1. POSTs to /api/auth/oauth-session (creates our JWT cookie + returns user)
 *   2. Calls useAuth.login() to hydrate the Zustand store
 *   3. Redirects to / (or the original destination)
 */

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/store/useAuth";

export default function OAuthCallbackPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { login }    = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/oauth-session", {
          method:      "POST",
          credentials: "include",
        });

        const data = await res.json() as { user?: Record<string, unknown>; error?: string };

        if (!res.ok || !data.user) {
          setError(data.error ?? "Autentificarea OAuth a eșuat. Încearcă din nou.");
          return;
        }

        // Hydrate Zustand with the DB user data
        login(data.user as Parameters<typeof login>[0]);

        // Redirect to original destination or homepage
        const callbackUrl = searchParams.get("callbackUrl") ?? "/";
        router.push(callbackUrl);
      } catch {
        setError("Ceva nu a mers. Verifică conexiunea și încearcă din nou.");
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-medium text-red-600">{error}</p>
          <Link
            href="/sign-in"
            className="mt-4 inline-block text-sm font-semibold text-[#22624a] hover:text-[#1a4d3a]"
          >
            ← Înapoi la autentificare
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="size-8 animate-spin text-[#22624a]" aria-hidden />
        <p className="text-sm text-slate-500">Se finalizează autentificarea…</p>
      </div>
    </div>
  );
}
