import { formatPrice } from "@/lib/products";

type ProductPriceDisplayProps = {
  price: number;
  oldPrice?: number | null;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const SIZE_CLASSES = {
  sm: {
    current: "text-sm font-bold",
  },
  md: {
    current: "text-lg font-bold sm:text-xl",
  },
  lg: {
    current: "text-3xl font-extrabold sm:text-4xl",
  },
} as const;

export default function ProductPriceDisplay({
  price,
  oldPrice,
  size = "md",
  className = "",
}: ProductPriceDisplayProps) {
  const showDiscount = oldPrice != null && oldPrice > price;
  const sizes = SIZE_CLASSES[size];

  return (
    <div className={`flex flex-wrap items-baseline gap-2 ${className}`}>
      <span
        className={`tracking-tight ${
          showDiscount ? `text-red-600 ${sizes.current}` : `text-neutral-900 ${sizes.current}`
        }`}
      >
        {formatPrice(price)}
      </span>
      {showDiscount && (
        <span className="text-sm text-gray-500 line-through">
          {formatPrice(oldPrice)}
        </span>
      )}
    </div>
  );
}
