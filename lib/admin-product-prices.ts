/** Decoupled admin form price fields (not 1:1 with DB columns). */
export type AdminProductPriceFields = {
  base_price: string;
  discounted_price: string;
};

/** Map DB columns → admin form fields. */
export function dbPricesToFormValues(
  dbPrice: string,
  dbOldPrice: string | null
): AdminProductPriceFields {
  if (dbOldPrice != null && dbOldPrice !== "") {
    return { base_price: dbOldPrice, discounted_price: dbPrice };
  }
  return { base_price: dbPrice, discounted_price: "" };
}

/** Map admin form fields → DB columns on save. */
export function formPricesToDb(
  basePrice: number,
  discountedPriceRaw: string
): { price: number; old_price: number | null } {
  const trimmed = discountedPriceRaw.trim();
  if (trimmed) {
    return { price: parseFloat(trimmed), old_price: basePrice };
  }
  return { price: basePrice, old_price: null };
}
