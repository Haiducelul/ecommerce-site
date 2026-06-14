import { z } from "zod";

const SUBCATEGORY_IDS = [
  "cpu", "placa_baza", "gpu", "ram", "sursa", "carcasa", "stocare",
] as const;

const CATEGORY_IDS = [
  "laptop", "phone", "tablet", "accessories", "desktop", "components",
] as const;

export const adminProductFormSchema = z
  .object({
    name:             z.string().min(2, "Cel puțin 2 caractere."),
    description:      z.string(),
    base_price:       z.string().min(1, "Câmp obligatoriu."),
    discounted_price: z.string().optional(),
    stock:            z.string().min(1, "Câmp obligatoriu."),
    category:         z.enum(CATEGORY_IDS),
    subcategory:      z.string().optional(),
    image_gallery:    z.array(z.object({ url: z.string() })),
    specifications:   z.array(z.object({ label: z.string(), value: z.string() })),
  })
  .superRefine((data, ctx) => {
    if (data.category === "components") {
      const result = z.enum(SUBCATEGORY_IDS).safeParse(data.subcategory);
      if (!result.success) {
        ctx.addIssue({
          code:     z.ZodIssueCode.custom,
          message:  "Selectați tipul componentei.",
          path:     ["subcategory"],
        });
      }
    }

    const basePrice = parseFloat(data.base_price);
    if (isNaN(basePrice) || basePrice <= 0) {
      ctx.addIssue({
        code:    z.ZodIssueCode.custom,
        message: "Introduceți un preț normal valid și pozitiv.",
        path:    ["base_price"],
      });
    }

    const discountedRaw = data.discounted_price?.trim() ?? "";
    if (discountedRaw) {
      const discountedPrice = parseFloat(discountedRaw);
      if (isNaN(discountedPrice) || discountedPrice <= 0) {
        ctx.addIssue({
          code:    z.ZodIssueCode.custom,
          message: "Introduceți un preț cu reducere valid și pozitiv.",
          path:    ["discounted_price"],
        });
      } else if (!isNaN(basePrice) && discountedPrice >= basePrice) {
        ctx.addIssue({
          code:    z.ZodIssueCode.custom,
          message: "Prețul cu reducere trebuie să fie strict mai mic decât prețul normal.",
          path:    ["discounted_price"],
        });
      }
    }
  });

export type ProductFormValues = z.infer<typeof adminProductFormSchema>;
