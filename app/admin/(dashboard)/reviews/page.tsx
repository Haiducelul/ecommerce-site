"use client";

import { Fragment, useEffect, useState } from "react";
import { Star, Pencil, Trash2, Loader2 } from "lucide-react";

interface Review {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  user_name: string;
  user_email: string;
  product_name: string;
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingReview, setEditingReview] = useState<string | null>(null);
  const [editComment, setEditComment] = useState("");
  const [deletingReview, setDeletingReview] = useState<string | null>(null);

  useEffect(() => {
    async function fetchReviews() {
      try {
        const res = await fetch("/api/admin/reviews");
        const json = await res.json();
        if (!res.ok) {
          console.error("Failed to fetch reviews:", json.error);
          return;
        }
        setReviews(json.data);
      } catch (err) {
        console.error("Error fetching reviews:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchReviews();
  }, []);

  const handleEdit = (review: Review) => {
    setEditingReview(review.id);
    setEditComment(review.comment || "");
  };

  const handleSaveEdit = async () => {
    if (!editingReview) return;

    try {
      const res = await fetch(`/api/admin/reviews/${editingReview}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: editComment }),
      });

      if (!res.ok) {
        console.error("Failed to update review");
        return;
      }

      // Update local state
      setReviews(reviews.map((r) => 
        r.id === editingReview ? { ...r, comment: editComment } : r
      ));
      setEditingReview(null);
      setEditComment("");
    } catch (err) {
      console.error("Error updating review:", err);
    }
  };

  const handleCancelEdit = () => {
    setEditingReview(null);
    setEditComment("");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Sigur doriți să ștergeți această recenzie?")) return;

    setDeletingReview(id);

    try {
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        console.error("Failed to delete review");
        return;
      }

      // Update local state
      setReviews(reviews.filter((r) => r.id !== id));
    } catch (err) {
      console.error("Error deleting review:", err);
    } finally {
      setDeletingReview(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ro-RO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Recenzii</h1>
        <p className="mt-1 text-sm text-slate-500">
          Gestionați și moderați recenziile lăsate de clienți
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Client
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Produs
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Rating
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Comentariu
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Data
                </th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Acțiuni
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reviews.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-sm text-slate-500">
                    Nu există recenzii încă.
                  </td>
                </tr>
              ) : (
                reviews.map((review) => (
                  <tr key={review.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {review.user_name || "Client necunoscut"}
                        </p>
                        <p className="text-xs text-slate-500">
                          {review.user_email || "email indisponibil"}
                        </p>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm text-slate-700">{review.product_name}</p>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1">
                        <Star className="size-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-medium text-slate-700">
                          {review.rating}/5
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 max-w-[300px]">
                      {editingReview === review.id ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={editComment}
                            onChange={(e) => setEditComment(e.target.value)}
                            className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-[#22624a] focus:outline-none focus:ring-1 focus:ring-[#22624a]"
                          />
                          <button
                            onClick={handleSaveEdit}
                            className="rounded-lg bg-[#22624a] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-opacity-90"
                          >
                            Salvează
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
                          >
                            Anulează
                          </button>
                        </div>
                      ) : (
                        <p className="text-sm text-slate-700 line-clamp-2">
                          {review.comment || "Fără comentariu"}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm text-slate-700">
                        {formatDate(review.created_at)}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(review)}
                          className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                          title="Editează"
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(review.id)}
                          disabled={deletingReview === review.id}
                          className="rounded-lg p-2 text-red-600 transition hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                          title="Șterge"
                        >
                          {deletingReview === review.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Trash2 className="size-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
