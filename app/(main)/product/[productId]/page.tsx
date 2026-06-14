import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Star, Sparkles, BadgePercent, PackageCheck, Truck, ShieldCheck } from "lucide-react";
import AddToCartButton from "@/components/AddToCartButton";
import WishlistButton from "@/components/WishlistButton";
import ProductReviewsSection from "@/components/ProductReviewsSection";
import ProductImageGallery from "@/components/ProductImageGallery";
import ProductPriceDisplay from "@/components/ProductPriceDisplay";
import {
  CATEGORY_LABELS,
  STATUS_LABELS,
  STATUS_COLORS,
  type StatusId,
} from "@/lib/products";
import { getProductById } from "@/lib/db-products";

type ProductPageProps = {
  params: Promise<{ productId: string }>;
};

const STATUS_ICONS: Record<StatusId, React.ReactNode> = {
  bestseller: <Star className="size-3.5" strokeWidth={2} aria-hidden />,
  ai: <Sparkles className="size-3.5" strokeWidth={2} aria-hidden />,
  reduceri: <BadgePercent className="size-3.5" strokeWidth={2} aria-hidden />,
};

export default async function ProductPage({ params }: ProductPageProps) {
  const { productId } = await params;
  const product = await getProductById(productId);

  if (!product) {
    notFound();
  }

  const categoryLabel = CATEGORY_LABELS[product.category];
  const statusLabel = STATUS_LABELS[product.status];
  const statusColorClasses = STATUS_COLORS[product.status];

  return (
    <div className="flex flex-col pb-16 pt-6">
      <div className="mx-auto w-full max-w-6xl px-6 md:px-12">
        {/* ── Breadcrumbs ── */}
        <nav aria-label="Breadcrumb" className="mb-6">
          <ol className="flex flex-wrap items-center gap-1 text-sm text-neutral-500">
            <li>
              <Link
                href="/"
                className="transition-colors hover:text-neutral-900"
              >
                TechPoint
              </Link>
            </li>
            <li aria-hidden>
              <ChevronRight className="size-3.5 shrink-0" strokeWidth={2} />
            </li>
            <li>
              <Link
                href={`/products?category=${product.category}`}
                className="transition-colors hover:text-neutral-900"
              >
                {categoryLabel}
              </Link>
            </li>
            <li aria-hidden>
              <ChevronRight className="size-3.5 shrink-0" strokeWidth={2} />
            </li>
            <li
              className="max-w-[240px] truncate font-medium text-neutral-900"
              aria-current="page"
            >
              {product.name}
            </li>
          </ol>
        </nav>

        {/* ── Main content grid ── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* ── Left: Product image gallery ── */}
          <div>
            <ProductImageGallery
              images={product.image_gallery}
              coverUrl={product.image_url}
              name={product.name}
              categoryLabel={categoryLabel}
            />
          </div>

          {/* ── Right: Product info ── */}
          <div className="flex flex-col gap-5">
            {/* Category + Status badges */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-700 ring-1 ring-neutral-200">
                {categoryLabel}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusColorClasses}`}
              >
                {STATUS_ICONS[product.status]}
                {statusLabel}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold leading-snug tracking-tight text-neutral-900 sm:text-3xl">
              {product.name}
            </h1>

            {/* Price */}
            <ProductPriceDisplay price={product.price} oldPrice={product.old_price} size="lg" />

            {/* CTA */}
            <div className="flex flex-col gap-3">
              <AddToCartButton
                productId={product.id}
                productName={product.name}
                productPrice={product.price}
                productStock={product.stock}
                productImageUrl={product.image_url}
              />
              <WishlistButton
                productId={product.id}
                productName={product.name}
                productPrice={product.price}
                productStock={product.stock}
                productCategory={product.category}
                productImageUrl={product.image_url}
              />
            </div>

            {/* Trust & Delivery */}
            <div className="mt-2 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
              <ul className="flex flex-col gap-3">
                <li className="flex items-center gap-3 text-sm">
                  <PackageCheck className="size-5 shrink-0 text-[#22624a]" strokeWidth={1.75} aria-hidden />
                  <span className="font-medium text-neutral-800">În stoc</span>
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <Truck className="size-5 shrink-0 text-neutral-500" strokeWidth={1.75} aria-hidden />
                  <span className="text-neutral-700">Livrare rapidă prin curier</span>
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <ShieldCheck className="size-5 shrink-0 text-neutral-500" strokeWidth={1.75} aria-hidden />
                  <span className="text-neutral-700">Garanție inclusă 24 luni</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* ── Unified content block ── */}
        <div className="mt-10 rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">

          {/* Description & Specs grid */}
          <div className="grid grid-cols-1 gap-0 lg:grid-cols-2">
            {/* Description */}
            <div className="pr-0 lg:border-r lg:border-neutral-200 lg:pr-8">
              <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-neutral-500">
                Descriere
              </h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-neutral-800 text-justify">
                {product.description}
              </p>
            </div>

            {/* Specs */}
            {product.specs && product.specs.trim().length > 0 && (
              <div className="mt-8 lg:mt-0 lg:pl-8">
                <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-neutral-500">
                  Specificații
                </h2>
                <div className="space-y-0 text-sm leading-relaxed text-neutral-800">
                  {product.specs.split('\n').map((line, index) => {
                    const parts = line.split(':');
                    const label = parts[0].trim();
                    const value = parts.slice(1).join(':').trim();
                    return (
                      <div
                        key={index}
                        className="grid grid-cols-[1fr_2fr] gap-4 py-2 border-b border-gray-100 last:border-0"
                      >
                        <span className="text-gray-500 font-medium">{label}</span>
                        <span className="text-neutral-800">{value}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="mt-8 border-t border-neutral-200 pt-8">
            <ProductReviewsSection
              productId={product.id}
              productName={product.name}
            />
          </div>

        </div>
      </div>
    </div>
  );
}
