"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Users, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

// ─── Types ────────────────────────────────────────────────────────────────────

type UserRole = "admin" | "customer";

type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  created_at: string;
};

type GuestCustomer = {
  shipping_name: string;
  shipping_email: string;
  latest_order_at: string;
};

type FormState = {
  name: string;
  email: string;
  role: UserRole;
  password: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  email: "",
  role: "customer",
  password: "",
};

const ROLE_LABELS: Record<UserRole, string> = {
  admin:    "Administrator",
  customer: "Client",
};

const ROLE_BADGE: Record<UserRole, string> = {
  admin:    "bg-violet-50 text-violet-700 ring-violet-200",
  customer: "bg-slate-50 text-slate-700 ring-slate-200",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ro-RO", {
    day:   "numeric",
    month: "short",
    year:  "numeric",
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function UsersPageClient() {
  const [users, setUsers]       = useState<AdminUser[]>([]);
  const [guests, setGuests]     = useState<GuestCustomer[]>([]);
  const [loading, setLoading]   = useState(true);
  const [guestsLoading, setGuestsLoading] = useState(true);
  const [saving, setSaving]     = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm]         = useState<FormState>(EMPTY_FORM);

  const isEdit  = editingId !== null;
  const isEmpty = !loading && users.length === 0;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/admin/users");
      const data = await res.json();
      if (!res.ok) {
        toast(data.error ?? "Nu s-au putut încărca utilizatorii.");
        return;
      }
      setUsers(data.users ?? []);
    } catch {
      toast("Eroare de rețea la încărcarea utilizatorilor.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchGuestCustomers = useCallback(async () => {
    setGuestsLoading(true);
    try {
      const res  = await fetch("/api/admin/guest-customers");
      const data = await res.json();
      if (!res.ok) {
        toast(data.error ?? "Nu s-au putut încărca clienții invitați.");
        return;
      }
      setGuests(data.guests ?? []);
    } catch {
      toast("Eroare de rețea la încărcarea clienților invitați.");
    } finally {
      setGuestsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchGuestCustomers();
  }, [fetchUsers, fetchGuestCustomers]);

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (user: AdminUser) => {
    setEditingId(user.id);
    setForm({
      name:     user.name,
      email:    user.email,
      role:     user.role,
      password: "",
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const name  = form.name.trim();
    const email = form.email.trim().toLowerCase();

    if (name.length < 2) {
      toast("Numele trebuie să aibă cel puțin 2 caractere.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast("Introduceți un email valid.");
      return;
    }
    if (!isEdit && form.password.length < 4) {
      toast("Parola trebuie să aibă cel puțin 4 caractere.");
      return;
    }

    setSaving(true);
    try {
      if (isEdit && editingId) {
        const res  = await fetch(`/api/admin/users/${editingId}`, {
          method:  "PATCH",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ name, email, role: form.role }),
        });
        const data = await res.json();
        if (!res.ok) {
          toast(data.error ?? "Actualizarea a eșuat.");
          return;
        }
        toast("Utilizator actualizat.");
      } else {
        const res  = await fetch("/api/admin/users", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({
            name,
            email,
            role:     form.role,
            password: form.password,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          toast(data.error ?? "Adăugarea a eșuat.");
          return;
        }
        toast("Utilizator adăugat.");
      }

      closeModal();
      await fetchUsers();
    } catch {
      toast("Eroare de rețea. Încearcă din nou.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (user: AdminUser) => {
    if (!confirm(`Ești sigur că vrei să ștergi "${user.name}"?`)) return;

    try {
      const res  = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error ?? "Ștergerea a eșuat.");
        return;
      }
      toast("Utilizator șters.");
      await fetchUsers();
    } catch {
      toast("Eroare de rețea. Încearcă din nou.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Utilizatori
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {loading
              ? "Se încarcă…"
              : isEmpty
                ? "Nu există utilizatori în baza de date."
                : `${users.length} utilizator${users.length !== 1 ? "i" : ""} înregistrați`}
          </p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-[#22624a] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#1a4d3a] focus-visible:outline focus-visible:ring-2 focus-visible:ring-[#22624a] focus-visible:ring-offset-2 disabled:opacity-50"
        >
          <Plus className="size-4" strokeWidth={2.5} aria-hidden />
          Adaugă utilizator
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-20 text-sm text-slate-500">
          <Loader2 className="size-5 animate-spin text-[#379b72]" aria-hidden />
          Se încarcă utilizatorii…
        </div>
      ) : isEmpty ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-slate-300 bg-white py-20 text-center">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-slate-100">
            <Users className="size-8 text-slate-400" strokeWidth={1.5} aria-hidden />
          </div>
          <div>
            <p className="text-base font-semibold text-slate-700">Lista este goală</p>
            <p className="mt-1 text-sm text-slate-500">
              Adaugă primul utilizator folosind butonul de mai sus.
            </p>
          </div>
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex items-center gap-2 rounded-lg bg-[#22624a] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#1a4d3a]"
          >
            <Plus className="size-4" strokeWidth={2.5} aria-hidden />
            Adaugă utilizator
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead>
                <tr className="bg-slate-50">
                  {["Nume", "Email", "Rol", "Înregistrat", "Acțiuni"].map((col) => (
                    <th
                      key={col}
                      scope="col"
                      className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((user) => (
                  <tr key={user.id} className="transition-colors hover:bg-slate-50/60">
                    <td className="max-w-[220px] px-5 py-4">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {user.name}
                      </p>
                      <p className="mt-0.5 truncate font-mono text-xs text-slate-400">
                        {user.id.slice(0, 8)}…
                      </p>
                    </td>
                    <td className="max-w-[260px] px-5 py-4">
                      <p className="truncate text-sm text-slate-700">{user.email}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${ROLE_BADGE[user.role]}`}
                      >
                        {ROLE_LABELS[user.role]}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm tabular-nums text-slate-600">
                        {formatDate(user.created_at)}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(user)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-[#a8d7c5] hover:bg-[#edf5f1] hover:text-[#1a4d3a]"
                        >
                          <Pencil className="size-3.5" aria-hidden />
                          Editează
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(user)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                        >
                          <Trash2 className="size-3.5" aria-hidden />
                          Șterge
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-slate-100 bg-slate-50 px-5 py-3">
            <p className="text-xs text-slate-500">
              {users.length} utilizator{users.length !== 1 ? "i" : ""} total
            </p>
          </div>
        </div>
      )}

      {/* Guest customers — orders placed without an account */}
      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900">
            Clienți Invitați (Fără cont)
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">
            {guestsLoading
              ? "Se încarcă…"
              : guests.length === 0
                ? "Niciun client invitat înregistrat."
                : `${guests.length} client${guests.length !== 1 ? "i" : ""} invitat${guests.length !== 1 ? "i" : ""}`}
          </p>
        </div>

        {guestsLoading ? (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-16 text-sm text-slate-500">
            <Loader2 className="size-5 animate-spin text-[#379b72]" aria-hidden />
            Se încarcă clienții invitați…
          </div>
        ) : guests.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
            <p className="text-sm font-medium text-slate-600">
              Nu există comenzi plasate de vizitatori fără cont.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead>
                  <tr className="bg-slate-50">
                    {["Nume", "Email", "Rol", "Ultima comandă", "Acțiuni"].map((col) => (
                      <th
                        key={col}
                        scope="col"
                        className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {guests.map((guest) => (
                    <tr
                      key={guest.shipping_email}
                      className="transition-colors hover:bg-slate-50/60"
                    >
                      <td className="max-w-[220px] px-5 py-4">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {guest.shipping_name}
                        </p>
                      </td>
                      <td className="max-w-[260px] px-5 py-4">
                        <p className="truncate text-sm text-slate-700">
                          {guest.shipping_email}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center rounded-full bg-[#22624a] px-2.5 py-0.5 text-xs font-medium text-white">
                          Vizitator
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm tabular-nums text-slate-600">
                          {formatDate(guest.latest_order_at)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-xs font-medium text-slate-400">
                          Cont inexistent
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-slate-100 bg-slate-50 px-5 py-3">
              <p className="text-xs text-slate-500">
                {guests.length} client{guests.length !== 1 ? "i" : ""} invitat
                {guests.length !== 1 ? "i" : ""} total
              </p>
            </div>
          </div>
        )}
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="user-form-title"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 id="user-form-title" className="text-lg font-bold text-slate-900">
                  {isEdit ? "Editează utilizator" : "Utilizator nou"}
                </h2>
                <p className="mt-0.5 text-sm text-slate-500">
                  {isEdit
                    ? "Actualizează numele, emailul sau rolul."
                    : "Completează datele și parola pentru noul utilizator."}
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                aria-label="Închide"
                className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="user-name">Nume</Label>
                <Input
                  id="user-name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="ex: Maria Popescu"
                  required
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="user-email">Email</Label>
                <Input
                  id="user-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="ex: maria@example.com"
                  required
                  disabled={saving}
                />
              </div>

              {!isEdit && (
                <div className="space-y-2">
                  <Label htmlFor="user-password">Parolă</Label>
                  <Input
                    id="user-password"
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    placeholder="Minim 4 caractere"
                    required
                    disabled={saving}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="user-role">Rol</Label>
                <select
                  id="user-role"
                  value={form.role}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, role: e.target.value as UserRole }))
                  }
                  disabled={saving}
                  className="flex h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22624a] disabled:opacity-50"
                >
                  <option value="customer">Client</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="submit" className="flex-1" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                      Se salvează…
                    </>
                  ) : isEdit ? (
                    "Salvează modificările"
                  ) : (
                    "Adaugă utilizatorul"
                  )}
                </Button>
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="inline-flex h-10 flex-1 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
                >
                  Anulează
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
