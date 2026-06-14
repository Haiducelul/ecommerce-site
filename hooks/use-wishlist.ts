import { create } from "zustand";

export type WishlistItem = {
  id: string;
  name: string;
  price: number;
  oldPrice?: number | null;
  stock: number;
  category: string;
  imageUrl?: string | null;
};

type WishlistState = {
  items: WishlistItem[];
  loaded: boolean;
  hydrating: boolean;
  hydrate: () => Promise<void>;
  resetSync: () => void;
  toggleItem: (item: WishlistItem) => Promise<boolean>;
  clearWishlist: () => void;
  isInWishlist: (id: string) => boolean;
};

function mapFavoriteDto(
  f: { id: string; name: string; price: number; oldPrice?: number | null; stock?: number; category?: string; imageUrl?: string | null }
): WishlistItem {
  return {
    id:       f.id,
    name:     f.name,
    price:    f.price,
    oldPrice: f.oldPrice ?? null,
    stock:    Number(f.stock ?? 0),
    category: f.category ?? "",
    imageUrl: f.imageUrl ?? null,
  };
}

export const useWishlist = create<WishlistState>()((set, get) => ({
  items: [],
  loaded: false,
  hydrating: false,

  resetSync: () => set({ loaded: false, hydrating: false }),

  hydrate: async () => {
    if (get().hydrating || get().loaded) return;
    set({ hydrating: true });

    try {
      const res = await fetch("/api/favorites", { credentials: "include" });
      const data = await res.json();

      if (res.ok) {
        const favorites = (data.favorites ?? []) as {
          id: string;
          name: string;
          price: number;
          stock: number;
          category: string;
          imageUrl?: string | null;
        }[];
        set({
          items: favorites.map(mapFavoriteDto),
          loaded: true,
        });
      } else {
        set({ items: [], loaded: true });
      }
    } catch {
      set({ items: [], loaded: true });
    } finally {
      set({ hydrating: false });
    }
  },

  toggleItem: async (item) => {
    const exists = get().isInWishlist(item.id);
    const prev = get().items;

    if (exists) {
      set({ items: prev.filter((i) => i.id !== item.id) });
      try {
        const res = await fetch("/api/favorites", {
          method: "DELETE",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ product_id: item.id }),
        });
        if (!res.ok) {
          set({ items: prev });
          return false;
        }
        return true;
      } catch {
        set({ items: prev });
        return false;
      }
    }

    set({ items: [...prev, item] });
    try {
      const res = await fetch("/api/favorites", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: item.id }),
      });
      const data = await res.json();

      if (!res.ok) {
        set({ items: prev });
        return false;
      }

      if (data.favorite) {
        set({
          items: prev
            .filter((i) => i.id !== item.id)
            .concat(mapFavoriteDto(data.favorite)),
        });
      }
      return true;
    } catch {
      set({ items: prev });
      return false;
    }
  },

  clearWishlist: () => set({ items: [] }),

  isInWishlist: (id) => get().items.some((i) => i.id === id),
}));
