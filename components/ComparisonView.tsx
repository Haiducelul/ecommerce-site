"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { GitCompare, Sparkles, X } from "lucide-react";
import { MAX_COMPARE, useCompare } from "@/hooks/use-compare";

export default function ComparisonView() {
  const router = useRouter();
  const pathname = usePathname();
  const { items, removeItem, clear } = useCompare();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (pathname === "/compare") return null;
  if (!mounted || items.length === 0) return null;

  const canCompare = items.length >= 2;
  const slots = Array.from({ length: MAX_COMPARE }, (_, index) => items[index] ?? null);

  return (
    <div
      role="region"
      aria-label="Comparare produse"
      className="fixed left-4 top-1/2 z-40 h-auto w-[205px] -translate-y-1/2 rounded-xl border border-neutral-200 bg-white p-3 shadow-lg"
    >
      <div className="mb-3 flex w-full items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <GitCompare className="size-4 shrink-0 text-[#22624a]" strokeWidth={2} aria-hidden />
          <p className="truncate text-sm font-semibold text-neutral-900">
            Comparație ({items.length}/{MAX_COMPARE})
          </p>
        </div>
        <button
          type="button"
          onClick={clear}
          aria-label="Golește comparația"
          className="flex size-6 shrink-0 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
        >
          <X className="size-3.5" strokeWidth={2} aria-hidden />
        </button>
      </div>

      <div className="flex w-full flex-col gap-3">
        {slots.map((product, index) =>
          product ? (
            <div
              key={product.id}
              className="relative w-full rounded-xl border border-neutral-200 bg-neutral-50 p-2 pr-7"
            >
              <button
                type="button"
                onClick={() => removeItem(product.id)}
                aria-label={`Elimină ${product.name} din comparație`}
                className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-md border border-neutral-200 bg-white text-neutral-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500"
              >
                <X className="size-2.5" strokeWidth={2} aria-hidden />
              </button>

              <div className="flex items-center gap-2">
                <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-neutral-100 bg-white p-0.5">
                  {product.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.imageUrl}
                      alt=""
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <span className="text-[10px] font-bold text-neutral-300">
                      {product.name.slice(0, 1)}
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1 overflow-hidden">
                  <Link
                    href={product.detailHref ?? "#"}
                    className="block truncate text-[13px] font-semibold leading-tight text-neutral-900 hover:text-[#22624a]"
                    title={product.name}
                  >
                    {product.name}
                  </Link>
                  <p className="mt-0.5 truncate text-xs font-bold text-[#22624a]">
                    {product.priceLabel}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div
              key={`empty-${index}`}
              className="flex w-full min-h-[64px] items-center justify-center rounded-xl border border-dashed border-neutral-200 bg-neutral-50/50 px-2 text-center text-xs leading-snug text-neutral-400"
            >
              Selectează încă un produs
            </div>
          )
        )}
      </div>

      <button
        type="button"
        disabled={!canCompare}
        onClick={() => router.push("/compare")}
        className="mt-3 flex w-full items-center justify-center gap-1 rounded-lg bg-[#22624a] px-3 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-[#1a4d3a] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:ring-2 focus-visible:ring-[#22624a] focus-visible:ring-offset-2"
      >
        <Sparkles className="size-3 shrink-0" strokeWidth={2} aria-hidden />
        Compară cu AI
      </button>
    </div>
  );
}
