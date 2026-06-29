"use client";

/**
 * Pagina /compare — layout side-by-side pentru 2–3 produse + panou analiză Volt.
 *
 * Design:
 *   - Header centrat cu icon GitCompare + titlu
 *   - Grid responsiv (1 col mobil, 2–3 col desktop) aliniat cu analiza AI
 *   - Empty state: border dashed, icon Sparkles, CTA către catalog
 *   - Panou AI: card alb cu spinner / eroare / coloane text + concluzie
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { GitCompare, Loader2, Sparkles } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import { useCompare } from "@/hooks/use-compare";
import { fetchWithRetry } from "@/lib/fetch-with-retry";

interface CompareAiResult {
  product1Analysis:  string;
  product2Analysis:  string;
  product3Analysis?: string;
  generalConclusion: string;
  analyses?:         string[];
}

const DELAY_NOTICE_MS = 4000;

/** Stări vizuale ale panoului AI: idle / spinner / conținut / mesaj eroare */
type AiState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; result: CompareAiResult; analyses: string[] }
  | { status: "error"; message: string };

/** Formatează textul AI ca listă verticală (gap-4, text-justify) */
function parseAnalysisLines(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^[-–•*·]\s*/, "").trim());
}

/** Coloană de analiză — paragrafe aliniate sub fiecare ProductCard */
function AnalysisText({ text }: { text: string }) {
  const items = parseAnalysisLines(text);
  if (items.length === 0) return null;

  return (
    <ul className="flex list-none flex-col gap-4 pl-0">
      {items.map((item, index) => (
        <li
          key={index}
          className="text-justify text-sm leading-snug text-neutral-700"
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

/** Concluzie generală — separator border-t, text pre-line */
function ConclusionBlock({ text }: { text: string }) {
  if (!text.trim()) return null;

  return (
    <p className="w-full whitespace-pre-line text-left text-sm leading-relaxed text-neutral-800">
      {text.trim()}
    </p>
  );
}

/** Tailwind grid: 2 coloane (md:grid-cols-2) sau 3 (md:grid-cols-3) */
function gridColsClass(count: number): string {
  if (count === 3) return "grid-cols-1 md:grid-cols-3";
  return "grid-cols-1 md:grid-cols-2";
}

function columnDividerClass(index: number, count: number): string {
  if (index >= count - 1) return "";
  // Separator vertical între coloanele de analiză (doar desktop)
  return "md:border-r md:border-gray-200 md:pr-6";
}

function columnPaddingClass(index: number): string {
  return index > 0 ? "md:pl-6" : "";
}

function normalizeAnalyses(data: CompareAiResult, count: number): string[] {
  if (Array.isArray(data.analyses) && data.analyses.length >= count) {
    return data.analyses.slice(0, count);
  }

  return [
    data.product1Analysis,
    data.product2Analysis,
    data.product3Analysis ?? "",
  ].slice(0, count);
}

export default function ComparePage() {
  const { items } = useCompare();
  const [mounted, setMounted] = useState(false);
  const [aiState, setAiState] = useState<AiState>({ status: "idle" });
  const [isDelayed, setIsDelayed] = useState(false);
  const [stockById, setStockById] = useState<Record<string, number>>({});

  const productCount = items.length;
  const gridClass = gridColsClass(productCount);

  useEffect(() => setMounted(true), []);

  const productKey = useMemo(
    () => items.map((p) => p.id).join("|"),
    [items],
  );

  useEffect(() => {
    if (!mounted || items.length === 0) {
      setStockById({});
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`/api/products?ids=${items.map((p) => p.id).join(",")}`);
        const data = await res.json() as {
          products?: { id: string; stock: number }[];
        };

        if (cancelled || !res.ok) return;

        const next: Record<string, number> = {};
        for (const product of data.products ?? []) {
          next[product.id] = Number(product.stock ?? 0);
        }
        setStockById(next);
      } catch {
        if (!cancelled) setStockById({});
      }
    })();

    return () => { cancelled = true; };
  }, [mounted, productKey, items]);

  const fetchComparison = async () => {
    if (items.length < 2) return;

    setAiState({ status: "loading" }); // afișează spinner centrat în panou
    setIsDelayed(false);
    const delayTimer = setTimeout(() => setIsDelayed(true), DELAY_NOTICE_MS);

    try {
      const res = await fetchWithRetry(
        "/api/ai/compare",
        {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ products: items }),
        },
        {
          maxRetries: 3,
          retryDelayMs: 2000,
          onRetry: () => setIsDelayed(true),
        },
      );

      const contentType = res.headers.get("content-type") ?? "";
      if (!res.ok || !contentType.includes("application/json")) {
        console.error("[compare] Răspuns neașteptat de la /api/ai/compare:", res.status, contentType);
        throw new Error(`Serviciul AI a returnat o eroare (${res.status}). Încearcă din nou.`);
      }

      const data = await res.json() as CompareAiResult & { error?: string };

      if (data.error) {
        throw new Error(data.error);
      }

      setAiState({
        status: "done",
        result: data,
        analyses: normalizeAnalyses(data, items.length),
      });
    } catch (err) {
      setAiState({
        status:  "error",
        message: err instanceof Error ? err.message : "Comparația AI a eșuat.",
      });
    } finally {
      clearTimeout(delayTimer);
      setIsDelayed(false);
    }
  };

  // La schimbarea selecției — reîncarcă panoul AI (păstrează același grid)
  useEffect(() => {
    if (!mounted || items.length < 2) {
      setAiState({ status: "idle" });
      return;
    }

    fetchComparison();
  }, [mounted, productKey, items]);

  if (!mounted) return null;

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-8 md:px-12">
      {/* Header pagină — titlu + subtitlu centrat */}
      <div className="mb-8 text-center">
        <h1 className="flex items-center justify-center gap-2.5 text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
          <GitCompare className="size-7 text-[#22624a]" strokeWidth={1.75} aria-hidden />
          Comparație produse
        </h1>
        <p className="mt-1 text-sm text-neutral-500">

          Analiză realizata de AI între 2–3 produse din aceeași categorie

        </p>

      </div>

      {/* Empty state: border dashed + icon Sparkles + buton verde spre catalog */}
      {items.length < 2 ? (
        <div className="flex flex-col items-center justify-center gap-5 rounded-2xl border border-dashed border-neutral-200 bg-white px-6 py-20 text-center">
          <Sparkles className="size-10 text-[#22624a]/40" strokeWidth={1.5} aria-hidden />
          <div>
            <p className="text-lg font-semibold text-neutral-800">
              Selectează 2–3 produse din aceeași categorie
            </p>
            <p className="mt-1 text-sm text-neutral-500">
              Folosește butonul „Compară” de pe cardurile de produs, apoi revino aici.
            </p>
          </div>
          <Link
            href="/products"
            className="inline-flex items-center justify-center rounded-xl bg-[#22624a] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#1a4d3a]"
          >
            Vezi produse
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {/* Rând ProductCard compact — lățime fixă w-80, centrat în coloană */}
          <div className={`grid gap-8 ${gridClass}`}>
            {items.map((product) => (
              <div key={product.id} className="flex justify-center">
                <div className="w-80 max-w-[450px]">
                  <ProductCard
                    compact
                    id={product.id}
                    title={product.name}
                    price={product.priceLabel}
                    priceRaw={product.price}
                    category={product.category}
                    detailHref={product.detailHref ?? `/product/${product.id}`}
                    imageUrl={product.imageUrl}
                    stock={stockById[product.id] ?? product.stock ?? 0}
                  />
                </div>
              </div>
            ))}
          </div>

          {aiState.status !== "idle" && (
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              {/* Spinner Loader2 verde brand în timpul analizei */}
              {aiState.status === "loading" && (
                <div className="flex flex-col items-center gap-3 py-6">
                  <Loader2 className="size-8 animate-spin text-[#22624a]" strokeWidth={1.75} aria-hidden />
                  <p className="text-sm font-medium text-[#22624a]">AI-ul analizează produsele…</p>
                  {isDelayed && (
                    <p className="text-xs text-neutral-400">
                      Serverele sunt aglomerate. Durează puțin mai mult, te rugăm să aștepți...
                    </p>
                  )}
                </div>
              )}

              {aiState.status === "error" && (
                <div className="py-4 text-center">
                  <p className="text-sm font-medium text-red-600">
                    {aiState.message}
                  </p>
                  <button
                    type="button"
                    onClick={fetchComparison}
                    className="mt-4 rounded-md bg-[#22624a] px-4 py-2 text-white transition hover:bg-opacity-90"
                  >
                    Încearcă din nou
                  </button>
                </div>
              )}

              {aiState.status === "done" && (
                <>
                  {/* Grid analiză — aceleași coloane ca produsele de deasupra */}
                  <div className={`grid gap-8 ${gridClass}`}>
                    {items.map((product, index) => (
                      <div
                        key={product.id}
                        className={`${columnDividerClass(index, productCount)} ${columnPaddingClass(index)}`}
                      >
                        <AnalysisText text={aiState.analyses[index] ?? ""} />
                      </div>
                    ))}
                  </div>

                  {/* Linie separatoare + bloc concluzie pe toată lățimea */}
                  <div className="col-span-full mt-4 w-full border-t border-gray-200 pt-4">
                    <ConclusionBlock text={aiState.result.generalConclusion} />
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
