import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string | null;
  stock?: number;
};

type CartState = {
  items: CartItem[];
  loaded: boolean;
  hydrating: boolean;
  hydrate: () => Promise<void>;
  /** Resets sync flags only — does not clear persisted cart items. */
  resetSync: () => void;
  addItem: (item: Omit<CartItem, "quantity">) => Promise<boolean>;
  removeItem: (id: string) => Promise<boolean>;
  updateQuantity: (id: string, quantity: number) => Promise<boolean>;
  clearCart: () => Promise<boolean>;
  itemCount: () => number;
  totalPrice: () => number;
};

export const CART_STORAGE_KEY = "sebitech-cart";

let serverSyncEnabled = false;
/** Prevents overlapping hydrate runs (React Strict Mode / rapid remounts). */
let activeHydrate: Promise<void> | null = null;

/** Called by CartHydrator when auth state changes. */
export function setCartServerSync(enabled: boolean) {
  serverSyncEnabled = enabled;
  if (!enabled) {
    activeHydrate = null;
  }
}

function mapCartDto(item: {
  id: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string | null;
  stock?: number;
}): CartItem {
  return {
    id:       item.id,
    name:     item.name,
    price:    item.price,
    quantity: item.quantity,
    imageUrl: item.imageUrl ?? null,
    stock:    item.stock,
  };
}

function applyItemsFromResponse(
  data: { items?: CartItem[] },
  set: (partial: Partial<CartState>) => void,
) {
  if (data.items) {
    set({ items: data.items.map(mapCartDto) });
  }
}

async function fetchServerCart(): Promise<CartItem[]> {
  const res = await fetch("/api/cart", { credentials: "include" });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? "Failed to load cart");
  }
  return (data.items ?? []).map(mapCartDto);
}

/** Items present locally but not yet on the server (guest leftovers at login). */
function findLocalOnlyItems(local: CartItem[], server: CartItem[]): CartItem[] {
  const serverIds = new Set(server.map((item) => item.id));
  return local.filter((item) => !serverIds.has(item.id));
}

async function pushLocalOnlyToServer(localOnly: CartItem[]): Promise<CartItem[]> {
  for (const item of localOnly) {
    const res = await fetch("/api/cart", {
      method:      "POST",
      credentials: "include",
      headers:     { "Content-Type": "application/json" },
      body:        JSON.stringify({ product_id: item.id, quantity: item.quantity }),
    });
    if (!res.ok) {
      throw new Error("Cart sync failed");
    }
  }
  return fetchServerCart();
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      loaded: false,
      hydrating: false,

      resetSync: () => {
        activeHydrate = null;
        set({ loaded: false, hydrating: false });
      },

      hydrate: async () => {
        if (!serverSyncEnabled) {
          set({ loaded: true, hydrating: false });
          return;
        }

        if (activeHydrate) {
          return activeHydrate;
        }

        activeHydrate = (async () => {
          set({ hydrating: true });

          try {
            const localItems = get().items;
            const serverItems = await fetchServerCart();
            const localOnly = findLocalOnlyItems(localItems, serverItems);

            if (localOnly.length === 0) {
              set({ items: serverItems, loaded: true });
              return;
            }

            const synced = await pushLocalOnlyToServer(localOnly);
            set({ items: synced, loaded: true });
          } catch {
            set({ loaded: true });
          } finally {
            set({ hydrating: false });
            activeHydrate = null;
          }
        })();

        return activeHydrate;
      },

      addItem: async (item) => {
        const prev = get().items;
        const existing = prev.find((i) => i.id === item.id);
        const nextQty = (existing?.quantity ?? 0) + 1;

        if (item.stock != null && nextQty > item.stock) {
          return false;
        }

        const optimistic: CartItem[] = existing
          ? prev.map((i) =>
              i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i,
            )
          : [...prev, { ...item, quantity: 1 }];

        set({ items: optimistic });

        if (!serverSyncEnabled) {
          return true;
        }

        try {
          const res = await fetch("/api/cart", {
            method:      "POST",
            credentials: "include",
            headers:     { "Content-Type": "application/json" },
            body:        JSON.stringify({ product_id: item.id, quantity: 1 }),
          });
          const data = await res.json();

          if (!res.ok) {
            set({ items: prev });
            return false;
          }

          applyItemsFromResponse(data, set);
          return true;
        } catch {
          set({ items: prev });
          return false;
        }
      },

      removeItem: async (id) => {
        const prev = get().items;
        set({ items: prev.filter((i) => i.id !== id) });

        if (!serverSyncEnabled) {
          return true;
        }

        try {
          const res = await fetch(`/api/cart/${id}`, {
            method:      "DELETE",
            credentials: "include",
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
      },

      updateQuantity: async (id, quantity) => {
        if (quantity <= 0) return get().removeItem(id);

        const prev = get().items;
        const target = prev.find((i) => i.id === id);
        if (!target) return false;

        if (target.stock != null && quantity > target.stock) {
          return false;
        }

        set({
          items: prev.map((i) => (i.id === id ? { ...i, quantity } : i)),
        });

        if (!serverSyncEnabled) {
          return true;
        }

        try {
          await fetch(`/api/cart/${id}`, {
            method:      "DELETE",
            credentials: "include",
          });

          const res = await fetch("/api/cart", {
            method:      "POST",
            credentials: "include",
            headers:     { "Content-Type": "application/json" },
            body:        JSON.stringify({ product_id: id, quantity }),
          });
          const data = await res.json();

          if (!res.ok) {
            set({ items: prev });
            return false;
          }

          applyItemsFromResponse(data, set);
          return true;
        } catch {
          set({ items: prev });
          return false;
        }
      },

      clearCart: async () => {
        const prev = get().items;
        set({ items: [] });

        if (!serverSyncEnabled) {
          return true;
        }

        try {
          const res = await fetch("/api/cart", {
            method:      "DELETE",
            credentials: "include",
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
      },

      itemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

      totalPrice: () =>
        get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    }),
    {
      name:          CART_STORAGE_KEY,
      storage:       createJSONStorage(() => localStorage),
      partialize:    (state) => ({ items: state.items }),
      onRehydrateStorage: () => (state) => {
        if (state && !serverSyncEnabled) {
          state.loaded = true;
        }
      },
    },
  ),
);
