/**
 * Stare globală pentru selecția vizuală de comparație (2–3 produse).
 * Alimentează butonul „Compară” de pe ProductCard și pagina /compare.
 */

import { create } from "zustand";
import type { CategoryId } from "@/lib/products";

/** Limită UI — grid-ul paginii /compare suportă maxim 3 coloane */
export const MAX_COMPARE = 3;

export type CompareProduct = {
  id:          string;
  name:        string;
  price:       number;
  priceLabel:  string;
  category:    CategoryId;
  stock?:      number;
  imageUrl?:   string | null;
  detailHref?: string;
};

/** Stări afișate utilizatorului prin toast (activ/inactiv/limită/categorie) */
export type CompareToggleResult =
  | "added"
  | "removed"
  | "full"
  | "category_mismatch";

type CompareState = {
  items: CompareProduct[];
  isInCompare: (id: string) => boolean;
  isFull: () => boolean;
  toggleItem: (item: CompareProduct) => CompareToggleResult;
  removeItem: (id: string) => void;
  clear: () => void;
};

export const useCompare = create<CompareState>()((set, get) => ({
  items: [],

  isInCompare: (id) => get().items.some((p) => p.id === id),

  isFull: () => get().items.length >= MAX_COMPARE,

  toggleItem: (item) => {
    const { items } = get();
    const exists = items.some((p) => p.id === item.id);

    // Toggle vizual pe card — butonul „Compară” revine la starea neutră
    if (exists) {
      set({ items: items.filter((p) => p.id !== item.id) });
      return "removed";
    }

    if (items.length >= MAX_COMPARE) {
      return "full";
    }

    // Comparația side-by-side cere aceeași categorie (layout pe coloane egale)
    if (items.length > 0) {
      const listCategory = items[0].category;
      if (item.category !== listCategory) {
        return "category_mismatch";
      }
    }

    set({ items: [...items, item] });
    return "added";
  },

  removeItem: (id) => {
    set({ items: get().items.filter((p) => p.id !== id) });
  },

  clear: () => set({ items: [] }),
}));
