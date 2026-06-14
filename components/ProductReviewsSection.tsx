"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Star, PenLine, User } from "lucide-react";
import Link from "next/link";

import { useAuth } from "@/store/useAuth";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

// ─── Types & schema ───────────────────────────────────────────────────────────

const reviewSchema = z.object({
  rating: z.number().min(1, { message: "Selectează o notă." }).max(5),
  comment: z.string().min(10, { message: "Comentariul trebuie să aibă cel puțin 10 caractere." }),
});

type ReviewValues = z.infer<typeof reviewSchema>;

type ProductReview = {
  id: string;
  user_id: string;
  rating: number;
  comment: string;
  created_at: string;
  author_name: string;
};

// ─── Star picker (controlled) ─────────────────────────────────────────────────

function StarPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [hovered, setHovered] = useState(0);
  const active = hovered || value;

  return (
    <div className="flex gap-1" role="radiogroup" aria-label="Notă produs">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} ${n === 1 ? "stea" : "stele"}`}
          onClick={() => onChange(n)}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          className="transition-transform active:scale-90"
        >
          <Star
            className={`size-7 transition-colors ${
              n <= active ? "text-amber-400" : "text-neutral-200"
            }`}
            fill={n <= active ? "currentColor" : "none"}
            strokeWidth={n <= active ? 0 : 1.5}
            aria-hidden
          />
        </button>
      ))}
    </div>
  );
}

// ─── Single review card ───────────────────────────────────────────────────────

function ReviewCard({
  authorName,
  rating,
  comment,
  date,
}: {
  authorName: string;
  rating: number;
  comment: string;
  date: string;
}) {
  const initials = authorName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <article className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#22624a] text-xs font-bold text-white">
            {initials}
          </div>
          <div>
            <p className="text-sm font-semibold text-neutral-900">{authorName}</p>
            <p className="text-xs text-neutral-400">
              {new Date(date).toLocaleDateString("ro-RO", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
        <div className="flex gap-0.5" aria-label={`Notă: ${rating} din 5`}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Star
              key={n}
              className={`size-4 ${n <= rating ? "text-amber-400" : "text-neutral-200"}`}
              fill={n <= rating ? "currentColor" : "none"}
              strokeWidth={n <= rating ? 0 : 1.5}
              aria-hidden
            />
          ))}
        </div>
      </div>
      <p className="text-sm leading-relaxed text-neutral-700">{comment}</p>
    </article>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type ProductReviewsSectionProps = {
  productId: string;
  productName: string;
};

export default function ProductReviewsSection({
  productId,
  productName,
}: ProductReviewsSectionProps) {
  const { user } = useAuth();

  const [mounted, setMounted] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => setMounted(true), []);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reviews?product_id=${productId}`);
      const data = await res.json();
      if (res.ok) {
        setReviews(data.reviews ?? []);
      } else {
        setReviews([]);
      }
    } catch {
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    if (!mounted) return;
    void fetchReviews();
  }, [mounted, fetchReviews]);

  const form = useForm<ReviewValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { rating: 0, comment: "" },
  });

  const { isSubmitting } = form.formState;

  const ownReview = user
    ? reviews.find((r) => r.user_id === user.id)
    : undefined;
  const isEditMode = !!ownReview;

  const openReviewForm = () => {
    if (ownReview) {
      form.reset({ rating: ownReview.rating, comment: ownReview.comment });
    } else {
      form.reset({ rating: 0, comment: "" });
    }
    setShowForm(true);
  };

  const closeReviewForm = () => {
    if (ownReview) {
      form.reset({ rating: ownReview.rating, comment: ownReview.comment });
    } else {
      form.reset({ rating: 0, comment: "" });
    }
    setShowForm(false);
  };

  const onSubmit = async (values: ReviewValues) => {
    if (!user) {
      toast("Trebuie să fii autentificat pentru a lăsa o recenzie.");
      return;
    }

    if (
      !window.confirm(
        "Ești sigur că vrei să postezi/actualizezi această recenzie?"
      )
    ) {
      return;
    }

    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: productId,
          rating:     values.rating,
          comment:    values.comment,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast(data.error ?? "Trimiterea recenziei a eșuat.");
        return;
      }

      toast(isEditMode ? "Recenzie actualizată!" : "Recenzie salvată!");
      setShowForm(false);
      await fetchReviews();
    } catch {
      toast("Eroare de rețea. Încearcă din nou.");
    }
  };

  const visibleReviews = mounted && !loading ? reviews : [];
  const avgRating =
    visibleReviews.length > 0
      ? visibleReviews.reduce((s, r) => s + r.rating, 0) / visibleReviews.length
      : 0;

  return (
    <section
      aria-labelledby="reviews-heading"
    >
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2
            id="reviews-heading"
            className="text-xl font-bold tracking-tight text-neutral-900 sm:text-2xl"
          >
            Recenzii 
          </h2>
          {visibleReviews.length > 0 && (
            <p className="mt-0.5 flex items-center gap-2 text-sm text-neutral-500">
              <span className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    className={`size-3.5 ${n <= Math.round(avgRating) ? "text-amber-400" : "text-neutral-200"}`}
                    fill={n <= Math.round(avgRating) ? "currentColor" : "none"}
                    strokeWidth={n <= Math.round(avgRating) ? 0 : 1.5}
                    aria-hidden
                  />
                ))}
              </span>
              {avgRating.toFixed(1)} · {visibleReviews.length}{" "}
              {visibleReviews.length === 1 ? "recenzie" : "recenzii"}
            </p>
          )}
        </div>

        {!showForm &&
          (user ? (
            <button
              type="button"
              onClick={openReviewForm}
              className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 shadow-sm transition-colors hover:bg-neutral-50 hover:text-neutral-900 focus-visible:outline focus-visible:ring-2 focus-visible:ring-[#22624a] focus-visible:ring-offset-2"
            >
              <PenLine className="size-4 shrink-0" strokeWidth={2} aria-hidden />
              {isEditMode ? "Editează recenzia" : "Adaugă o recenzie"}
            </button>
          ) : (
            <Link
              href="/sign-in"
              className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 shadow-sm transition-colors hover:bg-neutral-50"
            >
              <User className="size-4 shrink-0" strokeWidth={2} aria-hidden />
              Autentifică-te pentru a recenza
            </Link>
          ))}
      </div>

      {/* Review form */}
      {showForm && user && (
        <div className="mb-8 rounded-2xl border border-neutral-200 bg-neutral-50 p-6">
          <h3 className="mb-4 text-base font-semibold text-neutral-900">
            {isEditMode ? "Editează recenzia pentru" : "Recenzia ta pentru"}{" "}
            <span className="text-[#22624a]">{productName}</span>
          </h3>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5">
              <FormField
                control={form.control}
                name="rating"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notă</FormLabel>
                    <FormControl>
                      <StarPicker value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="comment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Comentariu</FormLabel>
                    <FormControl>
                      <textarea
                        rows={4}
                        placeholder="Descrie experiența ta cu acest produs..."
                        disabled={isSubmitting}
                        className="flex w-full resize-none rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22624a] aria-[invalid=true]:border-red-400"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-3">
                <Button type="submit" disabled={isSubmitting}>
                  {isEditMode ? "Actualizează recenzia" : "Trimite recenzia"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeReviewForm}
                  disabled={isSubmitting}
                  className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  Anulează
                </Button>
              </div>
            </form>
          </Form>
        </div>
      )}

      {/* Reviews list or empty state */}
      {mounted && loading ? (
        <p className="py-10 text-center text-sm text-neutral-500">Se încarcă recenziile…</p>
      ) : visibleReviews.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-neutral-200 bg-white px-6 py-14 text-center">
          <div className="rounded-full bg-neutral-100 p-5">
            <Star className="size-10 text-neutral-400" strokeWidth={1.5} aria-hidden />
          </div>
          <div>
            <p className="font-semibold text-neutral-700">Nicio recenzie încă.</p>
            <p className="mt-1 text-sm text-neutral-400">
              Fii primul care lasă o recenzie pentru acest produs.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleReviews.map((r) => (
            <ReviewCard
              key={r.id}
              authorName={r.author_name}
              rating={r.rating}
              comment={r.comment}
              date={r.created_at}
            />
          ))}
        </div>
      )}
    </section>
  );
}
