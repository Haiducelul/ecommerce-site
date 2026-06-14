"use client";

import { useEffect } from "react";
import { useAuth } from "@/store/useAuth";
import { useWishlist } from "@/hooks/use-wishlist";

/** Loads favorites from the API when the user is logged in; clears on logout. */
export default function WishlistHydrator() {
  const { user } = useAuth();
  const hydrate = useWishlist((s) => s.hydrate);
  const clearWishlist = useWishlist((s) => s.clearWishlist);
  const resetSync = useWishlist((s) => s.resetSync);

  useEffect(() => {
    if (!user) {
      clearWishlist();
      resetSync();
      return;
    }
    void hydrate();
  }, [user?.id, hydrate, clearWishlist, resetSync]);

  return null;
}
