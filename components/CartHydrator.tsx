"use client";

/**
 * Componentă invizibilă — sincronizează coșul cu serverul după autentificare,
 * astfel încât badge-ul din Navbar reflectă produsele corecte.
 */
import { useEffect, useRef } from "react";
import { useAuth } from "@/store/useAuth";
import { setCartServerSync, useCart } from "@/hooks/use-cart";

export default function CartHydrator() {
  const { user } = useAuth();
  const lastUserId = useRef<string | null>(null);

  useEffect(() => {
    const userId = user?.id ?? null;
    setCartServerSync(!!user);

    if (!user) {
      lastUserId.current = null;
      useCart.setState({ loaded: true, hydrating: false });
      return;
    }

    if (lastUserId.current === userId) {
      return;
    }

    lastUserId.current = userId;
    useCart.setState({ loaded: false });
    void useCart.getState().hydrate();
  }, [user?.id]);

  return null;
}
