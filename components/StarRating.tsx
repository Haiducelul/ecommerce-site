import { Star } from "lucide-react";

type StarRatingProps = {
  rating: number;
  maxStars?: number;
  sizeClass?: string;
  filledClass?: string;
  emptyClass?: string;
  gapClass?: string;
  ariaLabel?: string;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export default function StarRating({
  rating,
  maxStars = 5,
  sizeClass = "size-4",
  filledClass = "text-amber-400",
  emptyClass = "text-neutral-300",
  gapClass = "gap-0.5",
  ariaLabel,
}: StarRatingProps) {
  const safeRating = Number.isFinite(rating) ? clamp(rating, 0, maxStars) : 0;

  return (
    <span className={`inline-flex items-center ${gapClass}`} aria-label={ariaLabel}>
      {Array.from({ length: maxStars }, (_, index) => {
        const fillPercent = clamp((safeRating - index) * 100, 0, 100);
        return (
          <span key={index} className="relative inline-flex">
            <Star
              className={`${sizeClass} ${emptyClass}`}
              fill="none"
              strokeWidth={1.5}
              aria-hidden
            />
            <span
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${fillPercent}%` }}
            >
              <Star
                className={`${sizeClass} ${filledClass}`}
                fill="currentColor"
                strokeWidth={0}
                aria-hidden
              />
            </span>
          </span>
        );
      })}
    </span>
  );
}
