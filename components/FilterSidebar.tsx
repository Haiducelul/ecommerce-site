"use client";

import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { useState } from "react";

export const CATEGORY_OPTIONS = [
  { id: "laptop",      label: "Laptopuri"    },
  { id: "phone",       label: "Telefoane"    },
  { id: "tablet",      label: "Tablete"      },
  { id: "accessories", label: "Accesorii"    },
  { id: "desktop",     label: "Calculatoare" },
  { id: "components",  label: "Componente"   },
] as const;

export const SUBCATEGORY_OPTIONS = [
  { id: "cpu",        label: "Procesor"      },
  { id: "placa_baza", label: "Placă de bază" },
  { id: "gpu",        label: "Placă video"   },
  { id: "ram",        label: "RAM"           },
  { id: "sursa",      label: "Sursă"         },
  { id: "carcasa",    label: "Carcasă"       },
  { id: "stocare",    label: "Stocare"       },
] as const;

export const STATUS_OPTIONS = [
  { id: "noi",             label: "Produse noi"        },
  { id: "recomandari",     label: "Recomandări"        },
  { id: "cele_mai_vandute", label: "Cele mai vândute"  },
] as const;

export type CategoryId    = (typeof CATEGORY_OPTIONS)[number]["id"];
export type SubcategoryId = (typeof SUBCATEGORY_OPTIONS)[number]["id"];
export type StatusId      = (typeof STATUS_OPTIONS)[number]["id"];

const PRICE_SLIDER_MAX = 20_000;

export type FilterSidebarProps = {
  selectedCategories:    CategoryId[];
  onToggleCategory:      (id: CategoryId) => void;
  selectedSubcategories: SubcategoryId[];
  onToggleSubcategory:   (id: SubcategoryId) => void;
  selectedStatuses:      StatusId[];
  onToggleStatus:        (id: StatusId) => void;
  minPrice:              number;
  maxPrice:              number;
  onMinPriceChange:      (value: number) => void;
  onMaxPriceChange:      (value: number) => void;
};

export default function FilterSidebar({
  selectedCategories,
  onToggleCategory,
  selectedSubcategories,
  onToggleSubcategory,
  selectedStatuses,
  onToggleStatus,
  minPrice,
  maxPrice,
  onMinPriceChange,
  onMaxPriceChange,
}: FilterSidebarProps) {
  const activeCategoryCount = selectedCategories.length + selectedSubcategories.length;
  const showSubcategories   = selectedCategories.includes("components");

  // Keep the subcategory section expanded whenever it becomes visible
  const [subExpanded, setSubExpanded] = useState(true);

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm lg:sticky lg:top-24">
      <div className="mb-6 flex items-center gap-2 border-b border-neutral-100 pb-4">
        <SlidersHorizontal className="size-5 text-[#22624a]" strokeWidth={2} aria-hidden />
        <h2 className="text-lg font-bold tracking-tight text-neutral-900">Filtre</h2>
        {activeCategoryCount > 0 ? (
          <span className="ml-auto rounded-full bg-[#edf5f1] px-2 py-0.5 text-xs font-semibold text-[#1a4d3a]">
            {activeCategoryCount}
          </span>
        ) : null}
      </div>

      {/* ── Categorii ─────────────────────────────────────────────────────────── */}
      <section className="mb-8">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-neutral-800">
          Categorii
        </h3>
        <ul className="flex flex-col gap-2.5">
          {CATEGORY_OPTIONS.map(({ id, label }) => (
            <li key={id}>
              <label className="group flex cursor-pointer items-start gap-3 rounded-lg px-1 py-0.5 transition-colors hover:bg-neutral-50">
                <input
                  type="checkbox"
                  checked={selectedCategories.includes(id)}
                  onChange={() => onToggleCategory(id)}
                  className="mt-0.5 size-4 shrink-0 rounded border-neutral-300 text-[#22624a] focus:ring-[#22624a]"
                />
                <span className="text-sm font-medium leading-snug text-neutral-700 group-hover:text-neutral-900">
                  {label}
                </span>
              </label>
            </li>
          ))}
        </ul>
      </section>

      {/* ── Subcategorii Componente (conditional) ─────────────────────────────── */}
      {showSubcategories && (
        <section className="mb-8 rounded-lg border border-[#d4ebe2] bg-[#edf5f1]/40 px-3 py-3">
          <button
            type="button"
            onClick={() => setSubExpanded((v) => !v)}
            className="flex w-full items-center justify-between"
            aria-expanded={subExpanded}
          >
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#1a4d3a]">
              Tip componentă
            </h3>
            <ChevronDown
              className={`size-4 text-[#379b72] transition-transform duration-200 ${subExpanded ? "rotate-180" : ""}`}
              strokeWidth={2}
              aria-hidden
            />
          </button>

          {subExpanded && (
            <ul className="mt-3 flex flex-col gap-2.5">
              {SUBCATEGORY_OPTIONS.map(({ id, label }) => (
                <li key={id}>
                  <label className="group flex cursor-pointer items-start gap-3 rounded-lg px-1 py-0.5 transition-colors hover:bg-[#edf5f1]">
                    <input
                      type="checkbox"
                      checked={selectedSubcategories.includes(id)}
                      onChange={() => onToggleSubcategory(id)}
                      className="mt-0.5 size-4 shrink-0 rounded border-[#a8d7c5] text-[#22624a] focus:ring-[#22624a]"
                    />
                    <span className="text-sm font-medium leading-snug text-neutral-700 group-hover:text-neutral-900">
                      {label}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* ── Status special ────────────────────────────────────────────────────── */}
      <section className="mb-8">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-neutral-800">
          Status special
        </h3>
        <ul className="flex flex-col gap-2.5">
          {STATUS_OPTIONS.map(({ id, label }) => (
            <li key={id}>
              <label className="group flex cursor-pointer items-start gap-3 rounded-lg px-1 py-0.5 transition-colors hover:bg-neutral-50">
                <input
                  type="checkbox"
                  checked={selectedStatuses.includes(id)}
                  onChange={() => onToggleStatus(id)}
                  className="mt-0.5 size-4 shrink-0 rounded border-neutral-300 text-[#22624a] focus:ring-[#22624a]"
                />
                <span className="text-sm font-medium leading-snug text-neutral-700 group-hover:text-neutral-900">
                  {label}
                </span>
              </label>
            </li>
          ))}
        </ul>
      </section>

      {/* ── Preț ──────────────────────────────────────────────────────────────── */}
      <section>
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-neutral-800">Preț (lei)</h3>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-xs font-medium text-neutral-500">Min</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                placeholder="0"
                value={minPrice > 0 ? minPrice : ""}
                onChange={(e) => {
                  const v = e.target.value;
                  onMinPriceChange(v === "" ? 0 : Math.max(0, Number(v) || 0));
                }}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-900 outline-none transition-shadow placeholder:text-neutral-400 focus:border-[#22624a] focus:ring-2 focus:ring-[#22624a]/20"
              />
            </label>
            <label className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-xs font-medium text-neutral-500">Max</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                placeholder={`${PRICE_SLIDER_MAX}`}
                value={maxPrice < PRICE_SLIDER_MAX ? maxPrice : ""}
                onChange={(e) => {
                  const v = e.target.value;
                  onMaxPriceChange(
                    v === "" ? PRICE_SLIDER_MAX : Math.max(0, Math.min(PRICE_SLIDER_MAX, Number(v) || 0)),
                  );
                }}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-900 outline-none transition-shadow placeholder:text-neutral-400 focus:border-[#22624a] focus:ring-2 focus:ring-[#22624a]/20"
              />
            </label>
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between text-xs text-neutral-500">
              <span>Preț maxim</span>
              <span className="font-semibold text-[#22624a]">{maxPrice.toLocaleString("ro-RO")} lei</span>
            </div>
            <input
              type="range"
              min={0}
              max={PRICE_SLIDER_MAX}
              step={100}
              value={Math.min(maxPrice, PRICE_SLIDER_MAX)}
              onChange={(e) => onMaxPriceChange(Number(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-neutral-200 accent-[#22624a]"
              aria-label="Preț maxim"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
