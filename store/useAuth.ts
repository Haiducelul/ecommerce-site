import { create } from "zustand";
import { persist } from "zustand/middleware";

// Definim structura datelor publice ale utilizatorului (fără parolă)
export type AuthUser = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  avatar_url?: string;
};

// Definim starea și acțiunile disponibile în store-ul de autentificare
type AuthState = {
  user: AuthUser | null;
  login: (user: AuthUser) => void;
  logout: () => void;
  updateUser: (data: Partial<Omit<AuthUser, "id" | "email">>) => void;
};

// Creăm store-ul folosind Zustand
export const useAuth = create<AuthState>()(
  // Middleware-ul 'persist' salvează datele automat în localStorage
  // Astfel, utilizatorul rămâne logat și după un refresh de pagină
  persist(
    (set) => ({
      user: null, // Starea inițială: niciun utilizator logat

      // Setăm utilizatorul în stare când se loghează cu succes
      login: (user) => set({ user }),

      // Ștergem datele utilizatorului la delogare
      logout: () => set({ user: null }),

      // Actualizăm doar anumite date (ex: telefon, adresă)
      // Excludem 'id' și 'email' pentru a preveni modificarea lor accidentală
      updateUser: (data) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...data } : null,
        })),
    }),
    {
      name: "techpoint-auth", // Cheia sub care se salvează datele în browser (localStorage)
    },
  ),
);