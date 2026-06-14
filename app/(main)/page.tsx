import type { ComponentType } from "react";
import Image from "next/image";
import Link from "next/link";
import { Cpu, Headphones, Laptop, Monitor, Smartphone, Tablet } from "lucide-react";
import ProductCard, { type ProductCardProps } from "@/components/ProductCard";
import { formatPrice } from "@/lib/products";
import {
  getMostReviewedProducts,
  getNewestProducts,
  getTopSellingProducts,
} from "@/lib/db-products";

// Always fetch fresh data — bypasses Next.js full-route cache.
export const revalidate = 0;

/** Blue region in viewBox 0–1000 × 0–340: right side + wave (shifted right for text clearance) */
const HERO_WAVE_PATH =
  "M580 0H1000V340H576C460 328 406 252 418 170C430 88 496 32 580 0Z";

const SEE_MORE_LINK_CLASS =
  "text-[#22624a] hover:text-[#4faf8b] font-bold transition-colors";

const CATEGORY_LINKS = [
  { label: "Produse",     slug: ""            as const, icon: null       },
  { label: "Laptop",       slug: "laptop"      as const, icon: Laptop     },
  { label: "Telefoane",    slug: "phone"       as const, icon: Smartphone },
  { label: "Tablete",      slug: "tablet"      as const, icon: Tablet     },
  { label: "Accesorii",    slug: "accessories" as const, icon: Headphones },
  { label: "Calculatoare", slug: "desktop"     as const, icon: Monitor    },
  { label: "Componente",   slug: "components"  as const, icon: Cpu        },
] as const;

function toCardProps(p: {
  id: string;
  name: string;
  price: number;
  old_price: number | null;
  stock: number;
  category: ProductCardProps["category"];
  image_url: string | null;
}): ProductCardProps {
  return {
    id:         p.id,
    title:      p.name,
    price:      formatPrice(p.price),
    priceRaw:   p.price,
    oldPrice:   p.old_price,
    detailHref: `/product/${p.id}`,
    imageUrl:   p.image_url,
    stock:      p.stock,
    category:   p.category,
  };
}

export default async function Home() {
  const [newestProducts, mostReviewedProducts, topSellingProducts] = await Promise.all([
    getNewestProducts(4),
    getMostReviewedProducts(4),
    getTopSellingProducts(4),
  ]);
  const newestCards = newestProducts.map(toCardProps);
  const recommendedCards = mostReviewedProducts.map(toCardProps);
  const topSellingCards = topSellingProducts.map(toCardProps);

  return (
    <>
      <div className="mx-auto flex w-[90%] max-w-[1100px] flex-1 flex-col gap-6 px-6 py-4">
        <div className="flex flex-col gap-3">
        <section className="relative h-[340px] w-full overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
          <svg
            className="pointer-events-none absolute inset-y-0 right-0 h-full w-[92%] translate-x-6 text-[#22624a] sm:translate-x-10"
            viewBox="0 0 1000 340"
            preserveAspectRatio="none"
            aria-hidden
          >
            <path fill="currentColor" d={HERO_WAVE_PATH} />
          </svg>

          <div className="relative z-10 flex h-full w-full">
            <div className="flex w-[52%] shrink-0 flex-col justify-center pl-12 pr-12">
              <h1 className="text-2xl font-bold uppercase leading-tight tracking-tight text-black sm:text-3xl md:text-4xl lg:text-[2.75rem] lg:leading-tight">
                Configurează-ți propriul PC.
              </h1>
              <p className="mt-2 max-w-md text-sm text-neutral-600 sm:text-base">
                Performanță maximă, configurare simplă. Construiește-ți PC-ul exact așa cum îți dorești.
              </p>
              <div className="mt-4">
                <Link
                  href="/pc-builder"
                  className="inline-flex items-center justify-center rounded-full border-2 border-[#22624a] bg-white px-6 py-2 text-sm font-semibold text-[#22624a] transition-colors hover:bg-[#edf5f1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#22624a]"
                >
                  Configurează acum
                </Link>
              </div>
            </div>

            <div className="flex w-[48%] shrink-0 items-end justify-center pb-3 pr-8 pl-4">
              <Image
                src="/poza_logo.png"
                alt="Desktop PC"
                width={640}
                height={360}
                priority
                className="h-[320px] w-auto max-w-full object-contain object-bottom scale-110 drop-shadow-2xl"
              />
            </div>
          </div>
        </section>

        <nav
          className="flex w-full flex-wrap items-center justify-between gap-y-2 rounded-2xl border border-neutral-200 bg-white px-8 py-3 shadow-sm"
          aria-label="Categorii produse"
        >
          {CATEGORY_LINKS.map(({ label, slug, icon: Icon }) => (
            <CategoryLink key={slug} href={`/products?category=${slug}`} label={label} icon={Icon} />
          ))}
        </nav>
        </div>

        <div className="flex flex-col gap-12 pb-8">
          {/* Produse noi */}
          <section className="w-full" aria-labelledby="produse-noi-heading">
            <div className="mb-4 flex items-center justify-between">
              <h2 id="produse-noi-heading" className="text-xl font-bold">
                Produse noi
              </h2>
              <Link
                href="/products?status=noi"
                className={SEE_MORE_LINK_CLASS}
              >
                Vezi mai multe &rarr;
              </Link>
            </div>

            {newestCards.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
                {newestCards.map((product) => (
                  <div key={product.id} className="flex h-full min-h-0 w-full">
                    <ProductCard {...product} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50/60 px-4 py-10 text-center text-sm font-medium text-neutral-500">
                Nu există produse noi momentan.
              </p>
            )}
          </section>

          {/* Recomandări */}
          <section className="w-full" aria-labelledby="recomandari-heading">
            <div className="mb-4 flex items-center justify-between">
              <h2 id="recomandari-heading" className="text-xl font-bold">
                Recomandări
              </h2>
              <Link
                href="/products?status=recomandari"
                className={SEE_MORE_LINK_CLASS}
              >
                Vezi mai multe &rarr;
              </Link>
            </div>

            {recommendedCards.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
                {recommendedCards.map((product) => (
                  <div key={product.id} className="flex h-full min-h-0 w-full">
                    <ProductCard {...product} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50/60 px-4 py-10 text-center text-sm font-medium text-neutral-500">
                Nu există recomandări momentan.
              </p>
            )}
          </section>

          {/* Cele mai vândute */}
          <section className="w-full" aria-labelledby="cele-mai-vandute-heading">
            <div className="mb-4 flex items-center justify-between">
              <h2 id="cele-mai-vandute-heading" className="text-xl font-bold">
                Cele mai vândute
              </h2>
              <Link
                href="/products?status=cele_mai_vandute"
                className={SEE_MORE_LINK_CLASS}
              >
                Vezi mai multe &rarr;
              </Link>
            </div>

            {topSellingCards.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
                {topSellingCards.map((product) => (
                  <div key={product.id} className="flex h-full min-h-0 w-full">
                    <ProductCard {...product} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50/60 px-4 py-10 text-center text-sm font-medium text-neutral-500">
                Nu există produse vândute momentan.
              </p>
            )}
          </section>
        </div>
      </div>
    </>
  );
}

type IconType = ComponentType<{ className?: string; strokeWidth?: number }>;

function CategoryLink({
  href,
  label,
  icon: Icon,
}: {
  href:  string;
  label: string;
  icon:  IconType | null;
}) {
  return (
    <Link
      href={href}
      className="group flex shrink-0 cursor-pointer items-center gap-2 rounded-lg border border-transparent bg-transparent text-sm font-semibold text-neutral-700 transition-colors duration-150 hover:bg-neutral-50 hover:text-[#22624a]"
    >
      {Icon && (
        <Icon
          className="size-5 shrink-0 transition-transform duration-150 ease-out group-hover:scale-110"
          strokeWidth={1.75}
          aria-hidden
        />
      )}
      {label}
    </Link>
  );
}
