"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, ClipboardList, CreditCard, ShoppingBag } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/store/useAuth";

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order");
  const sessionId = searchParams.get("session_id");
  const isCardPayment = Boolean(sessionId);
  const { clearCart } = useCart();
  const { user } = useAuth();
  const clearedRef = useRef(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (clearedRef.current) return;
    clearedRef.current = true;
    void clearCart();
  }, [clearCart]);

  const isLoggedIn = mounted && !!user;

  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-lg flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <div className="rounded-full bg-[#edf5f1] p-6">
        {isCardPayment ? (
          <CreditCard className="size-14 text-[#22624a]" strokeWidth={1.5} aria-hidden />
        ) : (
          <CheckCircle2 className="size-14 text-[#22624a]" strokeWidth={1.5} aria-hidden />
        )}
      </div>

      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {isCardPayment ? "Plata cu cardul a reușit!" : "Comanda a fost plasată!"}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          {isCardPayment
            ? "Plata ta a fost procesată cu succes prin Stripe. Vei primi un email de confirmare cu detaliile comenzii și livrării."
            : "Îți mulțumim pentru comandă. Vei primi un email de confirmare cu detaliile livrării."}
        </p>
        {orderId && (
          <p className="mt-3 text-xs text-slate-400">
            Număr comandă: <span className="font-mono">{orderId.slice(0, 8)}…</span>
          </p>
        )}
        {isCardPayment && sessionId && (
          <p className="mt-2 text-xs text-slate-400">
            Referință plată: <span className="font-mono">{sessionId.slice(0, 12)}…</span>
          </p>
        )}
      </div>

      <div className="flex w-full max-w-sm flex-col items-stretch justify-center gap-3 sm:max-w-none sm:flex-row sm:items-center">
        <Link
          href="/products"
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#22624a] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#1a4d3a] sm:w-auto"
        >
          <ShoppingBag className="size-4 shrink-0" strokeWidth={2} aria-hidden />
          Continuă cumpărăturile
        </Link>

        {mounted && (
          isLoggedIn ? (
            <Link
              href="/profile"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 sm:w-auto"
            >
              <ClipboardList className="size-4 shrink-0" strokeWidth={2} aria-hidden />
              Vezi istoricul comenzilor
            </Link>
          ) : (
            <Link
              href="/sign-up"
              className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 sm:w-auto"
            >
              Creează un cont
            </Link>
          )
        )}
      </div>

      <div className="flex flex-col items-center mt-10 gap-3">
        <p className="text-gray-500 text-sm">
          Dacă ai întrebări sau nelămuriri, ne poți contacta aici.
        </p>
        <Link
          href="/contact"
          className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
        >
          Contactează-ne
        </Link>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center px-4 py-16 text-sm text-slate-500">
          Se încarcă confirmarea…
        </div>
      }
    >
      <CheckoutSuccessContent />
    </Suspense>
  );
}
