"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  AlertCircle,
  ArrowLeft,
  ShoppingBag,
  Loader2,
  UserCircle,
  CreditCard,
  Banknote,
} from "lucide-react";
import Link from "next/link";

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
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/store/useAuth";
import { formatPrice } from "@/lib/products";

// ─── Types & constants ────────────────────────────────────────────────────────

type PaymentMethod = "cash" | "card";

const PAYMENT_OPTIONS: {
  value: PaymentMethod;
  label: string;
  description: string;
  icon: typeof Banknote;
}[] = [
  {
    value:        "cash",
    label:        "Ramburs la curier",
    description:  "Plata se efectuează în numerar la momentul livrării.",
    icon:         Banknote,
  },
  {
    value:        "card",
    label:        "Plată cu cardul",
    description:  "Plata se procesează securizat prin Stripe Checkout.",
    icon:         CreditCard,
  },
];

const FORM_STORAGE_KEY = "checkout_form_data";

const checkoutSchema = z.object({
  fullName: z.string().min(3, { message: "Numele trebuie să aibă cel puțin 3 caractere." }),
  email:    z.string().email({ message: "Adresă de email invalidă." }),
  phone:    z
    .string()
    .min(10, { message: "Număr de telefon invalid." })
    .regex(/^[0-9+\s()-]+$/, { message: "Număr de telefon invalid." }),
  address:  z.string().min(5, { message: "Adresa trebuie să aibă cel puțin 5 caractere." }),
  city:     z.string().min(2, { message: "Orașul trebuie să aibă cel puțin 2 caractere." }),
});

type CheckoutValues = z.infer<typeof checkoutSchema>;

// ─── Inner component (uses useSearchParams) ───────────────────────────────────

function CheckoutContent() {
  const searchParams    = useSearchParams();
  const paymentFailed   = searchParams.get("payment_failed") === "1";
  const router          = useRouter();
  const { user }        = useAuth();
  const { items, totalPrice, clearCart } = useCart();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");

  const total   = totalPrice();
  const isEmpty = items.length === 0;

  // ── Form defaults: try to restore saved data first ──
  const savedRaw    = typeof window !== "undefined" ? sessionStorage.getItem(FORM_STORAGE_KEY) : null;
  const savedValues: Partial<CheckoutValues> = savedRaw ? JSON.parse(savedRaw) : {};

  const form = useForm<CheckoutValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      fullName: savedValues.fullName ?? user?.name ?? "",
      email:    savedValues.email    ?? user?.email ?? "",
      phone:    savedValues.phone    ?? "",
      address:  savedValues.address  ?? "",
      city:     savedValues.city     ?? "",
    },
  });

  // Sync auth user into form (only for empty fields)
  useEffect(() => {
    if (!user) return;
    if (!form.getValues("fullName")) form.setValue("fullName", user.name);
    if (!form.getValues("email"))    form.setValue("email",    user.email);
  }, [user, form]);

  const { isSubmitting } = form.formState;

  // ── Persist form values to sessionStorage on every change ──
  useEffect(() => {
    const subscription = form.watch((values) => {
      sessionStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(values));
    });
    return () => subscription.unsubscribe();
  }, [form]);

  // ── Submit ────────────────────────────────────────────────────────────────
  const onSubmit = async (values: CheckoutValues) => {
    const cartPayload = items.map((item) => ({
      product_id: item.id,
      quantity:   item.quantity,
    }));

    const shippingPayload = {
      name:    values.fullName,
      email:   values.email,
      phone:   values.phone,
      address: values.address,
      city:    values.city,
    };

    try {
      // ── Card payment: go straight to Stripe, order created by webhook ──
      if (paymentMethod === "card") {
        toast("Se pregătește redirecționarea către plată...");

        // Save form before leaving the page so we can restore if they cancel
        sessionStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(values));

        const stripeRes = await fetch("/api/checkout/stripe", {
          method:      "POST",
          credentials: "include",
          headers:     { "Content-Type": "application/json" },
          body:        JSON.stringify({ items: cartPayload, ...shippingPayload }),
        });

        const stripeData = await stripeRes.json();

        if (!stripeRes.ok || !stripeData.url) {
          toast(stripeData.error ?? "Redirecționarea către plata cu cardul a eșuat.");
          return;
        }

        window.location.href = stripeData.url;
        return;
      }

      // ── Cash payment: create order immediately ──
      toast("Comanda se procesează...");

      const res = await fetch("/api/checkout", {
        method:      "POST",
        credentials: "include",
        headers:     { "Content-Type": "application/json" },
        body:        JSON.stringify({
          items:          cartPayload,
          payment_method: "cash",
          ...shippingPayload,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast(data.error ?? "Plasarea comenzii a eșuat.");
        return;
      }

      // Clear persisted form data on success
      sessionStorage.removeItem(FORM_STORAGE_KEY);

      await new Promise((resolve) => setTimeout(resolve, 600));
      toast("Comandă acceptată!");
      router.push(`/checkout/success?order=${data.order_id as string}`);
    } catch {
      toast("Eroare de rețea. Încearcă din nou.");
    }
  };

  if (isEmpty) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 px-4 text-center">
        <div className="rounded-full bg-slate-100 p-6">
          <ShoppingBag className="size-12 text-slate-400" strokeWidth={1.5} aria-hidden />
        </div>
        <div>
          <p className="text-lg font-semibold text-slate-800">Coșul tău este gol.</p>
          <p className="mt-1 text-sm text-slate-500">
            Adaugă produse în coș înainte de a continua.
          </p>
        </div>
        <Link
          href="/products"
          className="inline-flex items-center gap-2 rounded-xl bg-[#22624a] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#1a4d3a]"
        >
          <ArrowLeft className="size-4" strokeWidth={2} aria-hidden />
          Înapoi la produse
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Finalizează comanda
          </h1>

          {/* ── Failed-payment banner ── */}
          {paymentFailed && (
            <div className="mt-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4">
              <AlertCircle
                className="mt-0.5 size-5 shrink-0 text-red-500"
                strokeWidth={2}
                aria-hidden
              />
              <p className="text-sm text-red-700">
                Plata nu a fost realizată. Te rugăm să introduci din nou datele sau să alegi altă metodă.
              </p>
            </div>
          )}

          {/* ── Guest banner ── */}
          {!user && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-white px-5 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <UserCircle
                    className="mt-0.5 size-5 shrink-0 text-[#22624a]"
                    strokeWidth={1.75}
                    aria-hidden
                  />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Continuă ca invitat</p>
                    <p className="mt-0.5 text-sm text-slate-500">
                      Completează datele de livrare mai jos — nu este nevoie de cont.
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Link
                    href="/sign-in"
                    className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    Autentificare
                  </Link>
                  <Link
                    href="/sign-up"
                    className="inline-flex items-center justify-center rounded-lg bg-[#22624a] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1a4d3a]"
                  >
                    Creează cont
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]"
          >
            <div className="flex flex-col gap-6">
              {/* ── Delivery details ── */}
              <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-4">
                  <h2 className="text-base font-semibold text-slate-900">Detalii livrare</h2>
                </div>

                <div className="flex flex-col gap-5 p-6">
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nume complet</FormLabel>
                        <FormControl>
                          <Input placeholder="Ion Popescu" disabled={isSubmitting} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="ion@exemplu.ro"
                            disabled={isSubmitting}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefon</FormLabel>
                        <FormControl>
                          <Input
                            type="tel"
                            placeholder="07xx xxx xxx"
                            disabled={isSubmitting}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-[1fr_160px]">
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Adresă</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Str. Exemplu, nr. 1, ap. 2"
                              disabled={isSubmitting}
                              {...field}
                            />
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
                </div>
              </section>

              {/* ── Payment method ── */}
              <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-4">
                  <h2 className="text-base font-semibold text-slate-900">Metodă de plată</h2>
                </div>
                <div className="flex flex-col gap-3 p-6">
                  {PAYMENT_OPTIONS.map((option) => {
                    const Icon     = option.icon;
                    const selected = paymentMethod === option.value;

                    return (
                      <label
                        key={option.value}
                        className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 px-4 py-3 transition-colors ${
                          selected
                            ? "border-[#22624a] bg-[#edf5f1]"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name="paymentMethod"
                          value={option.value}
                          checked={selected}
                          onChange={() => setPaymentMethod(option.value)}
                          disabled={isSubmitting}
                          className="sr-only"
                        />
                        <div
                          className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border-2 ${
                            selected ? "border-[#22624a]" : "border-slate-300"
                          }`}
                        >
                          {selected && <div className="size-2 rounded-full bg-[#22624a]" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <Icon
                              className={`size-4 shrink-0 ${selected ? "text-[#22624a]" : "text-slate-500"}`}
                              strokeWidth={2}
                              aria-hidden
                            />
                            <span
                              className={`text-sm font-medium ${
                                selected ? "text-[#143827]" : "text-slate-800"
                              }`}
                            >
                              {option.label}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-slate-500">{option.description}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </section>
            </div>

            {/* ── Order summary sidebar ── */}
            <div className="flex flex-col gap-4">
              <section className="sticky top-24 rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
                  <h2 className="text-base font-semibold text-slate-900">Rezumatul comenzii</h2>
                </div>

                <ul className="flex flex-col divide-y divide-slate-100 px-5">
                  {items.map((item) => (
                    <li key={item.id} className="flex items-start gap-3 py-3">
                      <div className="size-10 shrink-0 rounded-lg bg-neutral-950" aria-hidden />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-800">{item.name}</p>
                        <p className="text-xs text-slate-400">Cantitate: {item.quantity}</p>
                      </div>
                      <p className="shrink-0 text-sm font-semibold text-slate-900 tabular-nums">
                        {formatPrice(item.price * item.quantity)}
                      </p>
                    </li>
                  ))}
                </ul>

                <div className="border-t border-slate-100 px-5 py-4">
                  <div className="flex justify-between text-sm font-bold text-slate-900">
                    <span>Total</span>
                    <span className="text-lg tabular-nums">{formatPrice(total)}</span>
                  </div>
                </div>

                <div className="px-5 pb-5">
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="size-4 animate-spin" aria-hidden />
                        Se procesează...
                      </>
                    ) : paymentMethod === "card" ? (
                      "Continuă la plată"
                    ) : (
                      "Plasează comanda"
                    )}
                  </Button>
                  <div className="mt-4 text-center">
                    <Link href="/products" className="text-sm text-neutral-500 hover:text-neutral-700">
                      Înapoi
                    </Link>
                  </div>
                </div>
              </section>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}

// ─── Page (Suspense boundary for useSearchParams) ─────────────────────────────

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
          <Loader2 className="mr-2 size-5 animate-spin" aria-hidden />
          Se încarcă...
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
