"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Package,
  Clock,
  ChevronRight,
  Star,
  X,
  Check,
  Loader2,
  Camera,
} from "lucide-react";

import { useAuth } from "@/store/useAuth";
import { formatPrice } from "@/lib/products";
import {
  formatOrderStatus,
  getStatusBadgeClass,
  getStatusDotClass,
} from "@/lib/orderStatus";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

// ─── Schema ──────────────────────────────────────────────────────────────────

const profileSchema = z.object({
  name: z.string().min(2, { message: "Numele trebuie să aibă cel puțin 2 caractere." }),
  phone: z
    .string()
    .regex(/^[0-9+\s()-]*$/, { message: "Număr de telefon invalid." })
    .optional()
    .or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
});

type ProfileValues = z.infer<typeof profileSchema>;

type UserOrder = {
  id: string;
  status: string;
  total_amount: string;
  created_at: string;
  items: { name: string; quantity: number }[];
  payment_method: string;
};

type UserReview = {
  id: string;
  product_id: string;
  product_name: string;
  image_url: string | null;
  rating: number;
  comment: string;
  created_at: string;
};

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router = useRouter();
  const { user, logout, updateUser } = useAuth();

  const [mounted, setMounted] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [orders, setOrders] = useState<UserOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [reviews, setReviews] = useState<UserReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (mounted && !user) router.replace("/sign-in");
  }, [mounted, user, router]);

  // Sync profile from database (persists across logout/login)
  useEffect(() => {
    if (!mounted || !user) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/user/profile", { credentials: "include" });
        const data = await res.json();
        if (!cancelled && res.ok && data.user) {
          updateUser({
            name:       data.user.name,
            phone:      data.user.phone,
            address:    data.user.address,
            city:       data.user.city,
            avatar_url: data.user.avatar_url,
          });
        }
      } catch {
        // Keep cached auth state if fetch fails
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mounted, user?.id, updateUser]);

  useEffect(() => {
    if (!mounted || !user) return;

    let cancelled = false;
    (async () => {
      setOrdersLoading(true);
      try {
        const res = await fetch("/api/orders", { credentials: "include" });
        const data = await res.json();
        if (!cancelled && res.ok) {
          setOrders(data.orders ?? []);
        }
      } catch {
        if (!cancelled) setOrders([]);
      } finally {
        if (!cancelled) setOrdersLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mounted, user?.id]);

  useEffect(() => {
    if (!mounted || !user) return;

    let cancelled = false;
    (async () => {
      setReviewsLoading(true);
      try {
        const res = await fetch("/api/user/reviews", { credentials: "include" });
        const data = await res.json();
        if (!cancelled && res.ok) {
          setReviews(data.reviews ?? []);
        } else if (!cancelled) {
          setReviews([]);
        }
      } catch {
        if (!cancelled) setReviews([]);
      } finally {
        if (!cancelled) setReviewsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mounted, user?.id]);

  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name ?? "",
      phone: user?.phone ?? "",
      address: user?.address ?? "",
      city: user?.city ?? "",
    },
  });

  // Re-sync form when user data changes (e.g. after save)
  useEffect(() => {
    if (user) {
      form.reset({
        name: user.name,
        phone: user.phone ?? "",
        address: user.address ?? "",
        city: user.city ?? "",
      });
    }
  }, [user, form]);

  if (!mounted || !user) return null;

  const initials = user.name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {
      // Clear local state even if the request fails
    }
    logout();
    toast("Deconectat cu succes.");
    router.push("/");
  };

  const handleCancelEdit = () => {
    form.reset({
      name: user.name,
      phone: user.phone ?? "",
      address: user.address ?? "",
      city: user.city ?? "",
    });
    setIsEditing(false);
  };

  const onSubmit = async (values: ProfileValues) => {
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:    values.name,
          phone:   values.phone ?? "",
          address: values.address ?? "",
          city:    values.city ?? "",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast(data.error ?? "Actualizarea profilului a eșuat.");
        return;
      }

      if (data.user) {
        updateUser({
          name:       data.user.name,
          phone:      data.user.phone,
          address:    data.user.address,
          city:       data.user.city,
          avatar_url: data.user.avatar_url,
        });
      }

      setIsEditing(false);
      toast("Datele au fost actualizate!");
    } catch {
      toast("Eroare de rețea. Încearcă din nou.");
    }
  };

  const handleAvatarUpload = async (file: File) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast("Te rog să încarci o imagine validă.");
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast("Imaginea nu poate fi mai mare de 2MB.");
      return;
    }

    setAvatarUploading(true);

    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const res = await fetch("/api/user/avatar", {
        method: "PATCH",
        credentials: "include",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        toast(data.error ?? "Încărcarea avatarului a eșuat.");
        return;
      }

      updateUser({ avatar_url: data.avatar_url });
      toast("Avatarul a fost actualizat!");
    } catch {
      toast("Eroare de rețea. Încearcă din nou.");
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleAvatarUpload(file);
    }
  };

  const { isSubmitting } = form.formState;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
      <div className="mx-auto w-full max-w-5xl">

        {/* Page title */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Datele contului
          </h1>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">

          {/* ── Left: Summary card ───────────────────────────────────────── */}
          <aside className="flex flex-col gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              {/* Avatar */}
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="relative">
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.name}
                      className="size-20 rounded-full object-cover shadow-md shadow-[#22624a]/20"
                    />
                  ) : (
                    <div className="flex size-20 items-center justify-center rounded-full bg-[#22624a] text-2xl font-bold text-white shadow-md shadow-[#22624a]/20">
                      {initials}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={avatarUploading}
                    className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full bg-white border border-slate-200 text-slate-500 shadow-sm hover:bg-slate-50 hover:text-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Schimbă poza de profil"
                  >
                    {avatarUploading ? (
                      <Loader2 className="size-3.5 animate-spin" strokeWidth={2} aria-hidden />
                    ) : (
                      <Camera className="size-3.5" strokeWidth={2} aria-hidden />
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileInputChange}
                    className="hidden"
                    aria-hidden
                  />
                </div>
                <div>
                  <p className="text-lg font-semibold text-slate-900">{user.name}</p>
                  <p className="mt-0.5 flex items-center justify-center gap-1.5 text-sm text-slate-500">
                    {user.email}
                  </p>
                </div>
              </div>

              <hr className="my-5 border-slate-100" />

              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
              >
                Schimbă parola
              </button>

              <div className="h-3"></div>

              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 focus-visible:outline focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2"
              >
                Deconectare
              </button>
            </div>
          </aside>

          {/* ── Right: Main content ──────────────────────────────────────── */}
          <div className="flex flex-col gap-6">

            {/* ── Personal info ── */}
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                <div className="flex items-center gap-2">

                  <h2 className="text-base font-semibold text-slate-900">Date personale</h2>
                </div>
                {!isEditing && (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    aria-label="Editează datele personale"
                    className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
                  >
                    Editează
                  </button>
                )}
              </div>

              {isEditing ? (
                /* ── Edit form ── */
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="flex flex-col gap-5 p-6"
                  >
                    {/* Read-only email */}
                    <div className="flex flex-col gap-1.5">
                      <p className="text-sm font-medium text-neutral-700">Adresă de email</p>          
                        <Input
                          value={user.email}
                          readOnly
                          disabled
                          className=" opacity-60"
                        />
                      
                      <p className="text-xs text-slate-400">Emailul nu poate fi modificat.</p>
                    </div>

                    {/* Name */}
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nume complet</FormLabel>
                          <FormControl>
                              <Input placeholder="Ion Popescu"  disabled={isSubmitting} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Phone */}
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefon</FormLabel>
                          <FormControl>
                              <Input type="tel" placeholder="07xx xxx xxx"  disabled={isSubmitting} {...field} />    
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Address + City */}
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-[1fr_160px]">
                      <FormField
                        control={form.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Adresă</FormLabel>
                            <FormControl>
                                <Input placeholder="Str. Exemplu, nr. 1"  disabled={isSubmitting} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Oraș</FormLabel>
                            <FormControl>
                              <Input placeholder="București" disabled={isSubmitting} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-1">
                      <Button type="submit" disabled={isSubmitting} className="gap-2">
                        {isSubmitting ? (
                          <Loader2 className="size-4 animate-spin" aria-hidden />
                        ) : (
                          <Check className="size-4" strokeWidth={2.5} aria-hidden />
                        )}
                        Salvează
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCancelEdit}
                        disabled={isSubmitting}
                        className="gap-2 text-[#22624a] border-[#a8d7c5] hover:bg-[#edf5f1] hover:text-[#1a4d3a]"
                      >
                        <X className="size-4" strokeWidth={2} aria-hidden />
                        Anulează
                      </Button>
                    </div>
                  </form>
                </Form>
              ) : (
                /* ── Read-only view ── */
                <div className="grid grid-cols-1 gap-px bg-slate-100 sm:grid-cols-2">
                  <Field label="Nume complet" value={user.name}/>
                  <Field label="Adresă de email" value={user.email} />
                  <Field label="Telefon" value={user.phone || "—"}  />
                  <Field label="Adresă" value={[user.address, user.city].filter(Boolean).join(", ") || "—"}  />
                </div>
              )}
            </section>

            {/* ── Order history ── */}
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold text-slate-900">Istoric comenzi</h2>
                </div>
                {orders.length > 0 && (
                  <span className="rounded-full bg-[#edf5f1] px-2.5 py-0.5 text-xs font-semibold text-[#1a4d3a] ring-1 ring-[#a8d7c5]">
                    {orders.length}
                  </span>
                )}
              </div>

              {ordersLoading ? (
                <div className="flex items-center justify-center gap-2 px-6 py-14 text-sm text-slate-500">
                  <Loader2 className="size-5 animate-spin text-[#379b72]" aria-hidden />
                  Se încarcă comenzile…
                </div>
              ) : orders.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-4 px-6 py-14 text-center">
                  <div className="rounded-full bg-slate-100 p-5">
                    <Package className="size-10 text-slate-400" strokeWidth={1.5} aria-hidden />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-700">Nu ai plasat nicio comandă încă.</p>
                    <p className="mt-1 text-sm text-slate-400">
                      Descoperă produsele noastre și plasează prima ta comandă.
                    </p>
                  </div>
                  <a
                    href="/products"
                    className="mt-1 inline-flex items-center justify-center rounded-xl bg-[#22624a] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#1a4d3a]"
                  >
                    Explorează produsele
                  </a>
                </div>
              ) : (
                <ul className="flex flex-col divide-y divide-slate-100">
                  {orders.map((order) => {
                    const firstItem = order.items[0];
                    const itemLabel =
                      order.items.length === 0
                        ? "Comandă fără produse"
                        : order.items.length === 1
                        ? firstItem.name
                        : `${firstItem.name} +${order.items.length - 1} ${
                            order.items.length - 1 === 1 ? "produs" : "produse"
                          }`;

                    return (
                      <li
                        key={order.id}
                        className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex min-w-0 flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-slate-400">
                              #{order.id.slice(0, 8).toUpperCase()}
                            </span>
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${getStatusBadgeClass(order.status)}`}
                            >
                              <span
                                className={`size-1.5 rounded-full ${getStatusDotClass(order.status)}`}
                              />
                              {formatOrderStatus(order.status)}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-slate-900">{itemLabel}</p>
                          <p className="flex items-center gap-1.5 text-xs text-slate-400">
                            <Clock className="size-3" strokeWidth={2} aria-hidden />
                            {new Date(order.created_at).toLocaleDateString("ro-RO", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          <div className="text-right">
                            <p className="text-base font-bold tabular-nums text-slate-900">
                              {formatPrice(Number(order.total_amount))}
                            </p>
                            <p className="text-xs text-slate-400">{order.payment_method}</p>
                          </div>
                          <ChevronRight className="size-4 text-slate-300" strokeWidth={2} aria-hidden />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {/* ── My reviews ── */}
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                <div className="flex items-center gap-2">
                  <Star className="size-4 text-[#22624a]" strokeWidth={2} aria-hidden />
                  <h2 className="text-base font-semibold text-slate-900">Recenziile mele</h2>
                </div>
                {!reviewsLoading && reviews.length > 0 && (
                  <span className="rounded-full bg-[#edf5f1] px-2.5 py-0.5 text-xs font-semibold text-[#1a4d3a] ring-1 ring-[#a8d7c5]">
                    {reviews.length}
                  </span>
                )}
              </div>

              {reviewsLoading ? (
                <div className="flex items-center justify-center gap-2 px-6 py-14 text-sm text-slate-500">
                  <Loader2 className="size-5 animate-spin text-[#379b72]" aria-hidden />
                  Se încarcă recenziile…
                </div>
              ) : reviews.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-4 px-6 py-14 text-center">
                  <div className="rounded-full bg-slate-100 p-5">
                    <Star className="size-10 text-slate-400" strokeWidth={1.5} aria-hidden />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-700">Nu ai acordat nicio recenzie încă.</p>
                    <p className="mt-1 text-sm text-slate-400">
                      Cumpără un produs și lasă o recenzie.
                    </p>
                  </div>
                </div>
              ) : (
                <ul className="flex flex-col divide-y divide-slate-100">
                  {reviews.map((review) => (
                    <li
                      key={review.id}
                      className="flex flex-col gap-2 px-6 py-4 sm:flex-row sm:items-start sm:justify-between"
                    >
                      <div className="flex min-w-0 flex-col gap-1">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {review.product_name}
                        </p>
                        <p className="line-clamp-2 text-sm text-slate-500">
                          {review.comment}
                        </p>
                        <p className="flex items-center gap-1.5 text-xs text-slate-400">
                          <Clock className="size-3" strokeWidth={2} aria-hidden />
                          {new Date(review.created_at).toLocaleDateString("ro-RO", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star
                            key={n}
                            className={`size-4 ${n <= review.rating ? "text-amber-400" : "text-slate-200"}`}
                            fill={n <= review.rating ? "currentColor" : "none"}
                            strokeWidth={n <= review.rating ? 0 : 1.5}
                            aria-hidden
                          />
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

          </div>
        </div>
      </div>
    </div>
  );
}

// ── Helper ────────────────────────────────────────────────────────────────────

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white px-6 py-4">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}
