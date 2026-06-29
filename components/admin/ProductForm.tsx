"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Trash2, ImagePlus, UploadCloud, Plus } from "lucide-react";
import Link from "next/link";

import { adminProductFormSchema, type ProductFormValues } from "@/lib/admin-product-form";
import { formPricesToDb } from "@/lib/admin-product-prices";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

export type { ProductFormValues };

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: "laptop",      label: "Laptop"       },
  { value: "phone",       label: "Telefon"      },
  { value: "tablet",      label: "Tabletă"      },
  { value: "accessories", label: "Accesorii"    },
  { value: "desktop",     label: "Calculatoare" },
  { value: "components",  label: "Componente"   },
] as const;

const SUBCATEGORIES = [
  { value: "cpu",        label: "CPU"           },
  { value: "placa_baza", label: "Placă de bază" },
  { value: "gpu",        label: "GPU"           },
  { value: "ram",        label: "RAM"           },
  { value: "sursa",      label: "Sursă"         },
  { value: "carcasa",    label: "Carcasă"       },
  { value: "stocare",    label: "Stocare"       },
] as const;

// ─── UI helpers ───────────────────────────────────────────────────────────────

function FieldSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-5 text-sm font-semibold uppercase tracking-wider text-slate-500">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

type Props = {
  /** When provided the form runs in edit (PATCH) mode; omit for create (POST) mode. */
  productId?: string;
  defaultValues?: Partial<ProductFormValues>;
};

export default function ProductForm({ productId, defaultValues }: Props) {
  const router  = useRouter();
  const isEdit  = !!productId;

  const form = useForm<ProductFormValues>({
    resolver:      zodResolver(adminProductFormSchema),
    defaultValues: {
      name:             "",
      description:      "",
      base_price:       "",
      discounted_price: "",
      stock:            "",
      category:         "laptop",
      subcategory:      "",
      image_gallery:    [],
      specifications:   [],
      ...defaultValues,
    },
  });

  const { isSubmitting } = form.formState;
  const selectedCategory = form.watch("category");
  const isComponentCategory = selectedCategory === "components";

  // ── Gallery field array ───────────────────────────────────────────────────
  const gallery      = useFieldArray({ control: form.control, name: "image_gallery" });
  const galleryValues = form.watch("image_gallery");

  // ── Specifications field array ───────────────────────────────────────────
  const specs = useFieldArray({ control: form.control, name: "specifications" });

  const [uploadingIndex, setUploadingIndex] = useState<number>(-1);
  const fileInputRefs = useRef<Map<number, HTMLInputElement>>(new Map());

  const handleFileSelect = async (
    e: React.ChangeEvent<HTMLInputElement>,
    index: number
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    setUploadingIndex(index);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res  = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json();

      if (!res.ok) {
        toast(data.error ?? "Upload eșuat.");
        return;
      }

      if (index === gallery.fields.length) {
        gallery.append({ url: data.url });
      } else {
        form.setValue(`image_gallery.${index}.url`, data.url, { shouldDirty: true });
      }
    } catch {
      toast("Eroare de rețea la upload.");
    } finally {
      setUploadingIndex(-1);
    }
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const onSubmit = async (values: ProductFormValues) => {
    const basePrice = parseFloat(values.base_price);
    const stock = parseInt(values.stock, 10);

    if (isNaN(stock) || stock < 0 || !Number.isInteger(stock)) {
      form.setError("stock", { message: "Introduceți un stoc valid (număr întreg ≥ 0)." });
      return;
    }

    const { price, old_price } = formPricesToDb(
      basePrice,
      values.discounted_price ?? ""
    );

    const payload = {
      name:           values.name,
      description:    values.description,
      price,
      old_price,
      stock,
      category:       values.category,
      subcategory:    values.category === "components" ? values.subcategory : null,
      image_gallery:  values.image_gallery.map((g) => g.url),
      specifications: values.specifications
        .map((spec) => `${spec.label}: ${spec.value}`)
        .filter((line) => line.trim() !== "")
        .join("\n"),
    };

    try {
      const url    = isEdit ? `/api/admin/products/${productId}` : "/api/admin/products";
      const method = isEdit ? "PATCH" : "POST";

      const res  = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        toast(data.error ?? "Salvarea a eșuat.");
        return;
      }

      toast(isEdit ? "Produs actualizat cu succes!" : "Produs adăugat cu succes!");
      router.push("/admin/products");
      router.refresh();
    } catch {
      toast("Eroare de rețea. Încearcă din nou.");
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <div className="grid gap-6 xl:grid-cols-[1fr_320px]">

          {/* ═══════════════ LEFT COLUMN ═══════════════ */}
          <div className="space-y-6">

            {/* ── General info ── */}
            <FieldSection title="Informații generale">
              <FormField
                control={form.control} name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nume produs <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="ex: Laptop ASUS Vivobook 15" disabled={isSubmitting} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control} name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descriere</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descriere detaliată a produsului…"
                        className="min-h-[120px] resize-y"
                        disabled={isSubmitting}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FieldSection>

            {/* ── Price & Stock ── */}
            <FieldSection title="Preț & Stoc">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control} name="base_price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Preț normal <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input type="number" min="0" step="0.01" placeholder="3499.99"
                          inputMode="decimal" disabled={isSubmitting} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control} name="discounted_price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preț cu reducere</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" step="0.01" placeholder="2999.99"
                          inputMode="decimal" disabled={isSubmitting} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control} name="stock"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Stoc <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Input type="number" min="0" step="1" placeholder="50"
                          inputMode="numeric" disabled={isSubmitting} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </FieldSection>

            {/* ── Specifications ── */}
            <FieldSection title="Specificații tehnice">
              <div className="space-y-3">
                {specs.fields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-2 gap-4 items-start">
                    <FormField
                      control={form.control}
                      name={`specifications.${index}.label`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              placeholder="ex: Procesor"
                              disabled={isSubmitting}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex gap-2">
                      <FormField
                        control={form.control}
                        name={`specifications.${index}.value`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                              <Input
                                placeholder="ex: Intel Core i5-13500H"
                                disabled={isSubmitting}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <button
                        type="button"
                        onClick={() => specs.remove(index)}
                        disabled={isSubmitting}
                        className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                        aria-label="Șterge specificația"
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => specs.append({ label: "", value: "" })}
                  disabled={isSubmitting}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 py-3 text-sm font-medium text-slate-500 transition-colors hover:border-[#7bc3a8] hover:bg-[#edf5f1] hover:text-[#22624a] disabled:opacity-50"
                >
                  <Plus className="size-4" aria-hidden />
                  Adaugă specificație
                </button>
              </div>
            </FieldSection>

            {/* ── Image Gallery ── */}
            <FieldSection title="Galerie imagini">
              {gallery.fields.length > 0 && (
                <div className="space-y-3">
                  {gallery.fields.map((field, index) => {
                    const url       = galleryValues[index]?.url ?? "";
                    const uploading = uploadingIndex === index;
                    return (
                      <div key={field.id} className="flex items-center gap-3">
                        <div className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                          {uploading ? (
                            <Loader2 className="size-5 animate-spin text-[#379b72]" aria-hidden />
                          ) : url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={url} alt={`Imagine ${index + 1}`} className="size-full object-cover" />
                          ) : (
                            <ImagePlus className="size-5 text-slate-300" aria-hidden />
                          )}
                        </div>

                        <div className="flex min-w-0 flex-1 flex-col gap-1">
                          {index === 0 && (
                            <span className="w-fit rounded-full bg-[#edf5f1] px-2 py-0.5 text-xs font-medium text-[#22624a] ring-1 ring-inset ring-[#a8d7c5]">
                              Copertă
                            </span>
                          )}
                          <p className="truncate text-xs text-slate-500">
                            {url ? url.split("/").pop() : "Nicio imagine"}
                          </p>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            ref={(el) => {
                              if (el) fileInputRefs.current.set(index, el);
                              else fileInputRefs.current.delete(index);
                            }}
                            onChange={(e) => handleFileSelect(e, index)}
                          />
                          <button
                            type="button"
                            onClick={() => fileInputRefs.current.get(index)?.click()}
                            disabled={isSubmitting || uploading}
                            className="w-fit text-xs font-medium text-[#22624a] hover:text-[#1a4d3a] disabled:opacity-50"
                          >
                            Înlocuiește
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => gallery.remove(index)}
                          disabled={isSubmitting || uploading}
                          aria-label="Șterge imaginea"
                          className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                        >
                          <Trash2 className="size-4" aria-hidden />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={(el) => {
                  const newIndex = gallery.fields.length;
                  if (el) fileInputRefs.current.set(newIndex, el);
                }}
                onChange={(e) => handleFileSelect(e, gallery.fields.length)}
              />
              <button
                type="button"
                onClick={() => fileInputRefs.current.get(gallery.fields.length)?.click()}
                disabled={isSubmitting || uploadingIndex !== -1}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 py-3 text-sm font-medium text-slate-500 transition-colors hover:border-[#7bc3a8] hover:bg-[#edf5f1] hover:text-[#22624a] disabled:opacity-50"
              >
                {uploadingIndex === gallery.fields.length ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    Se încarcă…
                  </>
                ) : (
                  <>
                    <UploadCloud className="size-4" aria-hidden />
                    Adaugă imagine
                  </>
                )}
              </button>
            </FieldSection>

          </div>

          {/* ═══════════════ RIGHT COLUMN ═══════════════ */}
          <div className="space-y-6">

            {/* ── Classification ── */}
            <FieldSection title="Clasificare">
              <FormField
                control={form.control} name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categorie <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <select
                        disabled={isSubmitting}
                        className="flex h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22624a] disabled:cursor-not-allowed disabled:opacity-50"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          if (e.target.value !== "components") {
                            form.setValue("subcategory", "", { shouldValidate: true });
                          }
                        }}
                      >
                        {CATEGORIES.map(({ value, label }) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {isComponentCategory && (
                <FormField
                  control={form.control} name="subcategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tip componentă <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <select
                          disabled={isSubmitting}
                          className="flex h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22624a] disabled:cursor-not-allowed disabled:opacity-50"
                          {...field}
                        >
                          <option value="">Selectează tipul…</option>
                          {SUBCATEGORIES.map(({ value, label }) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </FieldSection>

            {/* ── Submit ── */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    Se salvează…
                  </>
                ) : isEdit ? (
                  "Actualizează produsul"
                ) : (
                  "Salvează produsul"
                )}
              </Button>
              <Link
                href="/admin/products"
                className="mt-3 block text-center text-sm text-slate-400 hover:text-slate-700"
              >
                Anulează
              </Link>
            </div>

          </div>
        </div>
      </form>
    </Form>
  );
}
