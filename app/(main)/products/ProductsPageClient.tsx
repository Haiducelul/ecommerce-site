"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import FilterSidebar, {
  CATEGORY_OPTIONS,
  SUBCATEGORY_OPTIONS,
  STATUS_OPTIONS,
  type CategoryId,
  type SubcategoryId,
  type StatusId as FilterStatusId,
} from "@/components/FilterSidebar";
import ProductCard from "@/components/ProductCard";
import {
  mapLegacyCatalogStatusToken,
  resolveCatalogStatusSortFromList,
  type CatalogStatusSort,
} from "@/lib/catalog-filters";
import type { StatusId as ProductStatusId } from "@/lib/products";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CatalogProduct = {
  id:           string;
  name:         string;
  price:        number;
  old_price:    number | null;
  stock:        number;
  category:     CategoryId;
  subcategory?: SubcategoryId;
  status:       ProductStatusId;
  image_url:    string | null;
  review_count: number;
  units_sold:   number;
  created_at:   string;
};

/** Sidebar status checkboxes — mutually exclusive sort modes */
const CATALOG_SORT_STATUSES: FilterStatusId[] = [
  "noi",
  "recomandari",
  "cele_mai_vandute",
];

// Raw URL search params that this page recognises.
export type ProductSearchParams = {
  category?:    string; // comma-separated CategoryId values     e.g. "laptop,phone"
  subcategory?: string; // comma-separated SubcategoryId values  e.g. "cpu,gpu"
  status?:      string; // comma-separated StatusId values       e.g. "bestseller,ai"
  minPrice?:    string; // lower price bound in lei
  maxPrice?:    string; // upper price bound in lei
  sort?:        string; // one of SORT_OPTIONS ids
};

const SORT_OPTIONS = [
  { id: "default",    label: "Implicit"         },
  { id: "price-asc",  label: "Preț crescător"   },
  { id: "price-desc", label: "Preț descrescător" },
  { id: "name",       label: "Alfabetic"         },
] as const;

type SortId = (typeof SORT_OPTIONS)[number]["id"];

// A single object that holds every active filter — this is what we encode to/from the URL.
type FilterState = {
  categories:    CategoryId[];
  subcategories: SubcategoryId[];
  statuses:      FilterStatusId[];
  minPrice:      number;
  maxPrice:      number;
  sort:          SortId;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const PRICE_MAX = 20_000;

// ─── URL ↔ State Codec ────────────────────────────────────────────────────────

// Pre-built sets used to validate URL values against known enum members.
const VALID_CATEGORIES    = new Set<CategoryId>(CATEGORY_OPTIONS.map((c) => c.id));
const VALID_SUBCATEGORIES = new Set<SubcategoryId>(SUBCATEGORY_OPTIONS.map((s) => s.id));
const VALID_STATUSES      = new Set<FilterStatusId>(STATUS_OPTIONS.map((s) => s.id));
const VALID_SORTS         = new Set<SortId>(SORT_OPTIONS.map((s) => s.id));

/**
 * Split a comma-separated URL string and keep only values that belong to
 * the valid set.  Unknown or tampered values are silently dropped.
 */
function parseList<T extends string>(raw: string | undefined, valid: Set<T>): T[] {
  if (!raw) return [];
  const out: T[] = [];
  for (const part of raw.split(",")) {
    const mapped = mapLegacyCatalogStatusToken(part);
    const id = (mapped ?? part.trim().toLowerCase()) as T;
    if (valid.has(id) && !out.includes(id)) out.push(id);
  }
  return out;
}

/**
 * Parse a price URL param into a number, clamping to [0, PRICE_MAX].
 * Returns `fallback` when the string is absent or not a finite number.
 */
function parsePrice(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.max(0, Math.min(PRICE_MAX, n)) : fallback;
}

/**
 * Decode raw URL search params → typed FilterState.
 */
function decodeFilters(params: ProductSearchParams): FilterState {
  const statuses = parseList(params.status, VALID_STATUSES);

  // Legacy homepage links: ?sort=recenzii | ?sort=top_vândute
  const legacySort = params.sort?.trim().toLowerCase();
  if (legacySort === "recenzii" && !statuses.includes("recomandari")) {
    statuses.push("recomandari");
  }
  const mappedSort = params.sort
    ? mapLegacyCatalogStatusToken(decodeURIComponent(params.sort))
    : null;
  if (mappedSort && !statuses.includes(mappedSort)) {
    statuses.push(mappedSort);
  }

  const rawSort = params.sort?.trim().toLowerCase();
  const sort =
    rawSort && VALID_SORTS.has(rawSort as SortId) ? (rawSort as SortId) : "default";

  const categories = parseList(params.category, VALID_CATEGORIES);

  // Only keep subcategories when "components" is active in the URL
  const subcategories = categories.includes("components")
    ? parseList(params.subcategory, VALID_SUBCATEGORIES)
    : [];

  return {
    categories,
    subcategories,
    statuses,
    minPrice: parsePrice(params.minPrice, 0),
    maxPrice: parsePrice(params.maxPrice, PRICE_MAX),
    sort,
  };
}

/**
 * Encode a FilterState → URL search params.
 * Default / empty values are omitted so the URL stays clean.
 */
function encodeFilters(f: FilterState): URLSearchParams {
  const p = new URLSearchParams();
  if (f.categories.length > 0)    p.set("category",    f.categories.join(","));
  if (f.subcategories.length > 0) p.set("subcategory", f.subcategories.join(","));
  if (f.statuses.length > 0)      p.set("status",      f.statuses.join(","));
  if (f.minPrice > 0)             p.set("minPrice",    String(f.minPrice));
  if (f.maxPrice < PRICE_MAX)     p.set("maxPrice",    String(f.maxPrice));
  if (f.sort !== "default")       p.set("sort",        f.sort);
  return p;
}

// ─── Component ────────────────────────────────────────────────────────────────

type ProductsPageClientProps = {
  initialParams: ProductSearchParams;
  products:      CatalogProduct[];
};

export default function ProductsPageClient({ initialParams, products }: ProductsPageClientProps) {
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState<FilterState>(() => decodeFilters(initialParams));

  // When true, the current filters update came from the URL — skip write-back.
  const isFromUrl = useRef(false);

  // Re-sync state whenever the URL changes externally (e.g. a category link from the homepage).
  useEffect(() => {
    isFromUrl.current = true;
    setFilters(decodeFilters({
      category:    searchParams.get("category")    ?? undefined,
      subcategory: searchParams.get("subcategory") ?? undefined,
      status:      searchParams.get("status")      ?? undefined,
      minPrice:    searchParams.get("minPrice")    ?? undefined,
      maxPrice:    searchParams.get("maxPrice")    ?? undefined,
      sort:        searchParams.get("sort")        ?? undefined,
    }));
  }, [searchParams]);

  // Write filter state back to the URL after user-driven changes.
  const hasMounted = useRef(false);
  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }
    if (isFromUrl.current) {
      isFromUrl.current = false;
      return;
    }
    const qs = encodeFilters(filters).toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [filters, pathname, router]);

  const toggleCategory = useCallback(
    (id: CategoryId) =>
      setFilters((f) => {
        const next = f.categories.includes(id)
          ? f.categories.filter((c) => c !== id)
          : [...f.categories, id];
        // Clear subcategories when "Componente" is deselected.
        const subcategories = next.includes("components") ? f.subcategories : [];
        return { ...f, categories: next, subcategories };
      }),
    [],
  );

  const toggleSubcategory = useCallback(
    (id: SubcategoryId) =>
      setFilters((f) => ({
        ...f,
        subcategories: f.subcategories.includes(id)
          ? f.subcategories.filter((s) => s !== id)
          : [...f.subcategories, id],
      })),
    [],
  );

  const toggleStatus = useCallback((id: FilterStatusId) => {
    setFilters((f) => {
      if (f.statuses.includes(id)) {
        return { ...f, statuses: f.statuses.filter((s) => s !== id) };
      }
      if (CATALOG_SORT_STATUSES.includes(id)) {
        return {
          ...f,
          statuses: [
            ...f.statuses.filter((s) => !CATALOG_SORT_STATUSES.includes(s)),
            id,
          ],
        };
      }
      return { ...f, statuses: [...f.statuses, id] };
    });
  }, []);

  const handleMinPrice = useCallback(
    (v: number) => setFilters((f) => ({ ...f, minPrice: v })),
    [],
  );

  const handleMaxPrice = useCallback(
    (v: number) => setFilters((f) => ({ ...f, maxPrice: v })),
    [],
  );

  const handleSort = useCallback(
    (id: SortId) => setFilters((f) => ({ ...f, sort: id })),
    [],
  );

  const visibleProducts = useMemo(() => {
    const statusSort = resolveCatalogStatusSortFromList(filters.statuses);

    const filtered = products.filter((p) => {
      if (
        filters.categories.length > 0 &&
        !filters.categories.includes(p.category.toLowerCase() as CategoryId)
      ) {
        return false;
      }
      // When subcategory filters are active, only show matching products.
      if (
        filters.subcategories.length > 0 &&
        (!p.subcategory || !filters.subcategories.includes(p.subcategory))
      ) {
        return false;
      }
      if (p.price < filters.minPrice) return false;
      if (p.price > filters.maxPrice) return false;
      return true;
    });

    const result = [...filtered];

    if (filters.sort === "default" && statusSort) {
      result.sort((a, b) => compareByCatalogStatusSort(a, b, statusSort));
    } else if (filters.sort === "price-asc") {
      result.sort((a, b) => a.price - b.price);
    } else if (filters.sort === "price-desc") {
      result.sort((a, b) => b.price - a.price);
    } else if (filters.sort === "name") {
      result.sort((a, b) => a.name.localeCompare(b.name, "ro"));
    }

    return result;
  }, [filters, products]);

  const showPcBuilderBanner =
    filters.categories.includes("desktop") || filters.categories.includes("components");

  return (
    <div className="mx-auto w-[90%] max-w-[1400px] flex-1 px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
        <aside className="w-full shrink-0 lg:w-[25%]">
          <FilterSidebar
            selectedCategories={filters.categories}
            onToggleCategory={toggleCategory}
            selectedSubcategories={filters.subcategories}
            onToggleSubcategory={toggleSubcategory}
            selectedStatuses={filters.statuses}
            onToggleStatus={toggleStatus}
            minPrice={filters.minPrice}
            maxPrice={filters.maxPrice}
            onMinPriceChange={handleMinPrice}
            onMaxPriceChange={handleMaxPrice}
          />
        </aside>

        <div className="min-w-0 flex-1 lg:w-[75%]">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
                Toate Produsele
              </h1>
              <p className="mt-1 text-sm text-neutral-500">
                {visibleProducts.length} din {products.length} produse
              </p>
            </div>

            <label className="flex items-center gap-2 text-sm text-neutral-600">
              <span className="font-medium">Sortare:</span>
              <select
                value={filters.sort}
                onChange={(e) => handleSort(e.target.value as SortId)}
                className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-800 shadow-sm outline-none focus:border-[#22624a] focus:ring-2 focus:ring-[#22624a]/20"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {showPcBuilderBanner && (
            <div className="mt-6 flex w-full flex-col gap-4 rounded-xl border border-[#22624a]/20 bg-[#22624a]/10 p-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-medium leading-relaxed text-[#22624a] sm:text-base">
                Descoperă noua funcționalitate de a-ți configura propriul calculator
              </p>
              <Link
                href="/pc-builder"
                className="inline-flex shrink-0 items-center justify-center rounded-lg bg-[#22624a] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1a4d3a] focus-visible:outline focus-visible:ring-2 focus-visible:ring-[#22624a] focus-visible:ring-offset-2"
              >
                Configurează acum
              </Link>
            </div>
          )}

          {visibleProducts.length === 0 ? (
            <p className="mt-12 rounded-xl border border-dashed border-neutral-200 bg-neutral-50 px-6 py-12 text-center text-base font-medium text-neutral-600">
              Nu am găsit produse
            </p>
          ) : (
            <div className="mt-8 grid grid-cols-1 items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {visibleProducts.map((product) => (
                <div key={product.id} className="flex h-full min-h-0 w-full">
                  <ProductCard
                    id={product.id}
                    title={product.name}
                    price={`${product.price.toLocaleString("ro-RO")} lei`}
                    priceRaw={product.price}
                    oldPrice={product.old_price}
                    detailHref={`/product/${product.id}`}
                    imageUrl={product.image_url}
                    stock={product.stock}
                    category={product.category}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function compareByCatalogStatusSort(
  a: CatalogProduct,
  b: CatalogProduct,
  mode: CatalogStatusSort,
): number {
  switch (mode) {
    case "cele_mai_vandute":
      return b.units_sold - a.units_sold || a.name.localeCompare(b.name, "ro");
    case "recomandari":
      return b.review_count - a.review_count || a.name.localeCompare(b.name, "ro");
    case "noi":
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime() ||
        a.name.localeCompare(b.name, "ro")
      );
    default:
      return 0;
  }
}
