"use client";

/**
 * Navbar sticky — bară albă fixă sus (z-50), layout orizontal pe 3 zone:
 *   1. Logo BuildTech (stânga)
 *   2. SearchBar + VoltSearchButton (centru, flex-1)
 *   3. Cont / Favorite / Coș (dreapta, icon Lucide + badge numeric)
 */

import { useCallback, useState, useEffect } from "react";
import Link from "next/link";
import {
  useCloseOnDesktop,
  useCloseOnRouteChange,
} from "@/hooks/use-overlay-guards";
import { Heart, ShoppingBag, LogIn } from "lucide-react";
import Cart from "@/components/Cart";
import SearchBar from "@/components/SearchBar";
import VoltSearchButton from "@/components/VoltSearchButton";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/store/useAuth";
import { useWishlist } from "@/hooks/use-wishlist";

export default function Navbar() {
  const [cartOpen, setCartOpen] = useState(false);
  const closeCart = useCallback(() => setCartOpen(false), []);

  useCloseOnRouteChange(closeCart);
  useCloseOnDesktop(cartOpen, closeCart);

  // Badge-urile numerice apar după mount — evită flicker la hidratare
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { itemCount } = useCart();
  const { user }      = useAuth();
  const { items: wishlistItems } = useWishlist();

  const count         = mounted ? itemCount()         : 0;
  const wishlistCount = mounted ? wishlistItems.length : 0;
  const loggedIn      = mounted ? !!user              : false;

  // Avatar: imagine rotundă sau cerc verde cu inițiale (fallback vizual)
  const initials = user?.name
    ? user.name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()
    : "";

  return (
    <>
      <nav className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white">
        {/* Container: h-16 fix, gap generos, padding lateral px-20 */}
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-3 sm:gap-3 sm:px-4 md:gap-[30px] md:px-20">

          {/* Zona 1 — logo text bold */}
          <Link
            href="/"
            className="shrink-0 text-base font-bold tracking-tight text-neutral-900 sm:text-lg md:text-xl"
          >
            BuildTech
          </Link>

          {/* Zona 2 — căutare clasică + buton Volt (flex-1, min-w-0 pentru overflow) */}
          <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-3 md:justify-start">
            <div className="hidden min-w-0 flex-1 md:block">
              <SearchBar />
            </div>
            <VoltSearchButton />
          </div>

          {/* Zona 3 — acțiuni dreapta: hover bg-neutral-100, accent #22624a */}
          <div className="flex shrink-0 items-center gap-1 text-neutral-600 sm:gap-2 md:gap-2">

            {/* Cont: avatar rotund sau icon LogIn; label „Cont” vizibil de la md: */}
            {loggedIn ? (
              <Link
                href="/profile"
                aria-label={`Profilul tău: ${user?.name}`}
                className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-neutral-100 focus-visible:outline focus-visible:ring-2 focus-visible:ring-[#22624a]"
              >
                {user?.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.name}
                    className="size-7 shrink-0 rounded-full object-cover ring-2 ring-transparent transition-all hover:ring-[#7bc3a8]"
                  />
                ) : (
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#22624a] text-[11px] font-bold text-white ring-2 ring-transparent transition-all hover:ring-[#7bc3a8]">
                    {initials}
                  </span>
                )}
                <span className="hidden text-sm font-medium text-neutral-600 md:block">Cont</span>
              </Link>
            ) : (
              <Link
                href="/sign-in"
                aria-label="Autentificare"
                className="flex items-center gap-1 rounded-lg px-1.5 py-1.5 text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-[#22624a] sm:gap-1.5 sm:px-2"
              >
                <LogIn className="size-5 shrink-0" strokeWidth={1.75} aria-hidden />
                <span className="hidden text-sm font-medium md:block">Cont</span>
              </Link>
            )}

            {/* Favorite: badge roz (rose-500) poziționat absolute pe icon */}
            <Link
              href="/favorites"
              aria-label={`Favorite${wishlistCount > 0 ? `, ${wishlistCount} produse` : ""}`}
              className="relative flex items-center gap-1 rounded-lg px-1.5 py-1.5 text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-[#22624a] sm:gap-1.5 sm:px-2"
            >
              <span className="relative">
                <Heart className="size-5 shrink-0" strokeWidth={1.75} aria-hidden />
                {wishlistCount > 0 && (
                  <span
                    aria-hidden
                    className="absolute -top-1.5 -right-1.5 flex h-4 min-w-[14px] items-center justify-center rounded-full bg-rose-500 px-1 text-xs font-bold text-white"
                  >
                    {wishlistCount > 99 ? "99+" : wishlistCount}
                  </span>
                )}
              </span>
              <span className="hidden text-sm font-medium md:block">Favorite</span>
            </Link>

            {/* Coș: badge verde brand; deschide Sheet-ul lateral Cart */}
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              aria-label={`Coș de cumpărături${count > 0 ? `, ${count} produse` : ""}`}
              className="relative flex items-center gap-1 rounded-lg px-1.5 py-1.5 text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-[#22624a] sm:gap-1.5 sm:px-2"
            >
              <span className="relative">
                <ShoppingBag className="size-5 shrink-0" strokeWidth={1.75} aria-hidden />
                {count > 0 && (
                  <span
                    aria-hidden
                    className="absolute -top-1.5 -right-1.5 flex h-4 min-w-[14px] items-center justify-center rounded-full bg-[#22624a] px-1 text-xs font-bold text-white"
                  >
                    {count > 99 ? "99+" : count}
                  </span>
                )}
              </span>
              <span className="hidden text-sm font-medium md:block">Coș</span>
            </button>

          </div>
        </div>
      </nav>

      {/* Drawer coș — componentă Cart (Sheet shadcn) */}
      <Cart open={cartOpen} onOpenChange={setCartOpen} />
    </>
  );
}
