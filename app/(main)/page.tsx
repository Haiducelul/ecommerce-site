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

const SEE_MORE_LINK_CLASS =
  "text-[#22624a] hover:text-[#4faf8b] font-bold transition-colors";

/** Gradient: lavender-purple (stânga) → icy blue (dreapta) */
const HERO_GRADIENT_BG =
  "bg-gradient-to-r from-[#9575eb] via-[#6b78e8] to-[#0891b2]";
const HERO_TEXT_GRADIENT = `${HERO_GRADIENT_BG} bg-clip-text text-transparent`;

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
      <div className="mx-auto flex w-[92%] max-w-[1100px] flex-1 flex-col gap-6 px-3 py-4 sm:w-[90%] sm:px-6">
        <div className="flex flex-col gap-3">
        <section className="relative w-full overflow-hidden rounded-3xl border border-neutral-200 bg-[#edf5f1] shadow-sm md:h-[340px]">
          <div className="relative z-10 flex h-full w-full flex-col items-center justify-between gap-4 px-4 py-6 md:flex-row md:gap-0 md:px-0 md:py-0">
            <div className="flex w-full shrink-0 flex-col items-center justify-center px-1 text-center md:w-[52%] md:items-start md:pl-12 md:pr-12 md:text-left">
              <h1
                className={`max-w-lg text-lg font-semibold leading-snug tracking-tight sm:text-xl md:text-2xl md:leading-relaxed ${HERO_TEXT_GRADIENT}`}
              >
                Configurează-ți calculatorul visat singur sau lasă-te ghidat de asistentul Volt.
              </h1>
              <p className={`mt-2 max-w-md text-sm md:text-base ${HERO_TEXT_GRADIENT}`}>
                Alege componentele potrivite sau lasă Volt să îți recomande configurația ideală.
              </p>
              <div className="mt-4">
                <Link
                  href="/pc-builder"
                  className={`inline-flex rounded-full p-[2px] ${HERO_GRADIENT_BG} transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9575eb]`}
                >
                  <span className="inline-flex items-center justify-center rounded-full bg-white px-6 py-2 text-sm font-semibold transition-colors hover:bg-[#edf5f1]">
                    <span className={HERO_TEXT_GRADIENT}>Configurează acum</span>
                  </span>
                </Link>
              </div>
            </div>

            <div className="flex w-full shrink-0 items-end justify-center px-2 pb-0 md:w-[48%] md:pb-3 md:pl-4 md:pr-8">
              <Image
                src="/poza_log.png"
                alt="BuildTech"
                width={640}
                height={360}
                priority
                className="h-[220px] w-auto max-w-full object-contain object-bottom drop-shadow-2xl sm:h-[260px] md:h-[320px] md:scale-110"
              />
            </div>
          </div>
        </section>

        <nav
          className="grid w-full grid-cols-3 gap-2 rounded-2xl border border-neutral-200 bg-white p-2 shadow-sm sm:grid-cols-4 sm:gap-3 sm:p-3 md:flex md:flex-wrap md:items-center md:justify-between md:gap-y-2 md:px-8 md:py-3"
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
      className="group flex min-h-[70px] w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-neutral-200 bg-white p-2 text-center text-xs font-semibold text-neutral-700 transition-colors duration-150 hover:border-[#a8d7c5] hover:bg-[#edf5f1]/50 hover:text-[#22624a] sm:text-sm md:min-h-0 md:w-auto md:flex-row md:justify-start md:gap-2 md:border-transparent md:bg-transparent md:p-0 md:text-left"
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
