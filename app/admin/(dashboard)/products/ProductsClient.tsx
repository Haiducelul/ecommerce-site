"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Package, Pencil } from "lucide-react";
import DeleteProductButton from "./DeleteProductButton";

type Product = {
  id:         string;
  name:       string;
  category:   string;
  price:      string;
  stock:      number;
  image_url:  string | null;
  created_at: Date;
};

const CATEGORY_LABELS: Record<string, string> = {
  laptop:      "Laptop",
  phone:       "Telefon",
  tablet:      "Tabletă",
  accessories: "Accesorii",
  desktop:     "Calculatoare",
  components:  "Componente",
};

const STOCK_BADGE = (stock: number) => {
  if (stock === 0)  return { label: "Epuizat",    cls: "bg-red-50    text-red-700    ring-red-200"    };
  if (stock <= 5)   return { label: "Stoc mic",   cls: "bg-amber-50  text-amber-700  ring-amber-200"  };
  return              { label: "În stoc",    cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" };
};

function formatPrice(raw: string): string {
  return `${Number(raw).toLocaleString("ro-RO")} lei`;
}

interface ProductsClientProps {
  products: Product[];
}

export default function ProductsClient({ products }: ProductsClientProps) {
  const [categoryFilter, setCategoryFilter] = useState<string>("toate");

  const filteredProducts = categoryFilter === "toate"
    ? products
    : products.filter((product) => product.category === categoryFilter);

  const isEmpty = filteredProducts.length === 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Produse</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {isEmpty
              ? "Nu există produse în catalog."
              : `${filteredProducts.length} produs${filteredProducts.length !== 1 ? "e" : ""} afișat${filteredProducts.length !== 1 ? "e" : ""}${categoryFilter !== "toate" ? ` (din ${products.length} total)` : ""}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label htmlFor="category-filter" className="text-sm font-medium text-slate-600">
            Categorie:
          </label>
          <select
            id="category-filter"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22624a]"
          >
            <option value="toate">Toate</option>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <Link
            href="/admin/products/new"
            className="inline-flex items-center gap-2 rounded-lg bg-[#22624a] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#1a4d3a] focus-visible:outline focus-visible:ring-2 focus-visible:ring-[#22624a] focus-visible:ring-offset-2"
          >
            <Plus className="size-4" strokeWidth={2.5} aria-hidden />
            Adaugă Produs
          </Link>
        </div>
      </div>

      {/* Empty state */}
      {isEmpty ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-slate-300 bg-white py-20 text-center">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-slate-100">
            <Package className="size-8 text-slate-400" strokeWidth={1.5} aria-hidden />
          </div>
          <div>
            <p className="text-base font-semibold text-slate-700">
              {categoryFilter === "toate" ? "Catalogul este gol" : "Nu există produse în această categorie"}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {categoryFilter === "toate"
                ? "Adaugă primul produs pentru a-l afișa în magazin."
                : "Încearcă să selectezi o altă categorie."}
            </p>
          </div>
          {categoryFilter === "toate" && (
            <Link
              href="/admin/products/new"
              className="inline-flex items-center gap-2 rounded-lg bg-[#22624a] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#1a4d3a]"
            >
              <Plus className="size-4" strokeWidth={2.5} aria-hidden />
              Adaugă Produs
            </Link>
          )}
        </div>
      ) : (
        /* ── Table ── */
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead>
                <tr className="bg-slate-50">
                  {["Imagine", "Nume", "Categorie", "Preț", "Stoc", "Acțiuni"].map((col) => (
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
                {filteredProducts.map((product) => {
                  const badge = STOCK_BADGE(product.stock);
                  return (
                    <tr key={product.id} className="transition-colors hover:bg-slate-50/60">
                      {/* Imagine */}
                      <td className="px-5 py-4">
                        <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                          {product.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="size-full object-cover"
                            />
                          ) : (
                            <Package className="size-5 text-slate-400" strokeWidth={1.5} aria-hidden />
                          )}
                        </div>
                      </td>

                      {/* Nume */}
                      <td className="max-w-[280px] px-5 py-4">
                        <p className="truncate text-sm font-semibold text-slate-900">{product.name}</p>
                        <p className="mt-0.5 truncate text-xs text-slate-400 font-mono">
                          {product.id.slice(0, 8)}…
                        </p>
                      </td>

                      {/* Categorie */}
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                          {CATEGORY_LABELS[product.category] ?? product.category}
                        </span>
                      </td>

                      {/* Preț */}
                      <td className="px-5 py-4">
                        <span className="text-sm font-semibold tabular-nums text-slate-900">
                          {formatPrice(product.price)}
                        </span>
                      </td>

                      {/* Stoc */}
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${badge.cls}`}
                        >
                          {badge.label}
                          {product.stock > 0 && (
                            <span className="ml-1 tabular-nums opacity-75">({product.stock})</span>
                          )}
                        </span>
                      </td>

                      {/* Acțiuni */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/admin/products/${product.id}/edit`}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-[#a8d7c5] hover:bg-[#edf5f1] hover:text-[#1a4d3a]"
                          >
                            <Pencil className="size-3.5" aria-hidden />
                            Editează
                          </Link>
                          <DeleteProductButton id={product.id} name={product.name} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer count */}
          <div className="border-t border-slate-100 bg-slate-50 px-5 py-3">
            <p className="text-xs text-slate-500">
              {filteredProducts.length} produs{filteredProducts.length !== 1 ? "e" : ""} afișat{filteredProducts.length !== 1 ? "e" : ""}{categoryFilter !== "toate" && ` (din ${products.length} total)`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
