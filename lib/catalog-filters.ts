/**
 * lib/catalog-filters.ts — browser-safe
 *
 * Shared catalog sidebar "status" tokens (sort modes, not products.status).
 */

export type CatalogStatusSort = "noi" | "recomandari" | "cele_mai_vandute";

/** When multiple sort modes are active, first match wins. */
export const CATALOG_STATUS_SORT_PRIORITY: CatalogStatusSort[] = [
  "cele_mai_vandute",
  "recomandari",
  "noi",
];

const LEGACY_STATUS_MAP: Record<string, CatalogStatusSort> = {
  noi:              "noi",
  recomandari:      "recomandari",
  cele_mai_vandute: "cele_mai_vandute",
  recenzii:         "recomandari",
  reduceri:         "recomandari",
  ai:               "recomandari",
  bestseller:       "cele_mai_vandute",
  top_vandute:      "cele_mai_vandute",
  "top_vândute":    "cele_mai_vandute",
};

export function mapLegacyCatalogStatusToken(token: string): CatalogStatusSort | null {
  return LEGACY_STATUS_MAP[token.trim().toLowerCase()] ?? null;
}

export function collectCatalogStatusSorts(
  statusParam?: string,
  sortParam?: string
): CatalogStatusSort[] {
  const found = new Set<CatalogStatusSort>();

  if (statusParam) {
    for (const raw of statusParam.split(",")) {
      const mapped = mapLegacyCatalogStatusToken(raw);
      if (mapped) found.add(mapped);
    }
  }

  const sort = sortParam?.trim().toLowerCase();
  if (sort === "recenzii") found.add("recomandari");
  if (sort && mapLegacyCatalogStatusToken(decodeURIComponent(sort))) {
    found.add(mapLegacyCatalogStatusToken(decodeURIComponent(sort))!);
  }

  return CATALOG_STATUS_SORT_PRIORITY.filter((id) => found.has(id));
}

/** Primary sort mode for SQL / client ordering. */
export function resolveCatalogStatusSort(
  statusParam?: string,
  sortParam?: string
): CatalogStatusSort | undefined {
  return collectCatalogStatusSorts(statusParam, sortParam)[0];
}

export function resolveCatalogStatusSortFromList(
  statuses: readonly string[]
): CatalogStatusSort | undefined {
  for (const id of CATALOG_STATUS_SORT_PRIORITY) {
    if (statuses.includes(id)) return id;
  }
  return undefined;
}
